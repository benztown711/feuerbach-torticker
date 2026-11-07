import { configOf, isRetired, viewerOf } from '../domain/live-spieltag';
import {
  buildRecord,
  encodeRecord,
  mergeRecord,
  parseRecord,
  recordAt,
  stamp,
  type LiveTeamRef,
  type SquadRecord,
  type SquadState,
} from '../domain/squad-sync';
import { inSquad, squadsOf } from '../domain/squads';
import type { LiveSpieltag, Player, Settings, Squad } from '../domain/types';
import { getPlayers, getSettings, putPlayers, putSettings } from './db';
import { sealSquad, squadSlot, unsealSquad } from './live-crypto';
import { liveSettingsChanged, squadNotice, squadsChanged } from './live-events';
import { newReceiver, type LiveReceiver } from './live-receiver';
import { adoptPlan, adoptReceived } from './live-setup';
import { sendOrg } from './relay-write';

/**
 * Spec 016 (plan.md, research.md R-B3 bis R-B6): geteilte Kader speichern, senden und von anderen Trainer-Handys
 * übernehmen. Wird nachgeladen; ohne Trainer-Link (Organisator-Schlüssel) tut es nur das Speichern.
 */

let queue: Promise<unknown> = Promise.resolve();

/** Speichern, Übernehmen und Senden nacheinander, damit nichts überschrieben wird. */
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

const newId = (): string => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

/** Trainer-Handy mit gültigem Live-Spieltag, sonst null. */
const trainerLive = (s: Settings): (LiveSpieltag & Required<Pick<LiveSpieltag, 'orgKey'>>) | null =>
  s.live?.orgKey && !isRetired(s.live) ? (s.live as LiveSpieltag & Required<Pick<LiveSpieltag, 'orgKey'>>) : null;

/** FR-B01: Schalter "Mit Trainern geteilt" nur auf Trainer-Handys mit gültigem Live-Spieltag. */
export const isTrainer = (s: Settings): boolean => trainerLive(s) !== null;

const liveTeams = (live: LiveSpieltag): LiveTeamRef[] => live.teams.map((t) => ({ key: t.key, name: t.name }));

const stateOf = (s: Settings, players: Player[]): SquadState => ({ players, squads: squadsOf(s), teams: s.teams });

/** Kader so speichern, wie es die Einstellungen kennen (ohne gespeicherte Kader bleibt das Feld leer). */
const squadsField = (s: Settings, squads: Squad[]): Squad[] | undefined =>
  s.squads === undefined && squads.length === 1 && squads[0]!.id === 'kader' && !squads[0]!.sid ? undefined : squads;

/** Was beim Dienst zuletzt je Kader (`sid`) stand (empfangen oder gesendet): `at` der Meldung. */
const known = new Map<string, number>();

async function send(live: LiveSpieltag & { orgKey: NonNullable<LiveSpieltag['orgKey']> }, rec: SquadRecord) {
  const at = recordAt(rec);
  const ok = await sendOrg(live, {
    kind: 'squad',
    slot: await squadSlot(live.viewKey, rec.s),
    at,
    gone: !rec.sh,
    body: await sealSquad(live.orgKey, encodeRecord(rec)),
  }).catch(() => false);
  if (ok) known.set(rec.s, Math.max(known.get(rec.s) ?? 0, at));
  return ok;
}

/** Sendet die Kader `sids` (bzw. Grabsteine gelöschter) des gekoppelten Live-Spieltags. */
async function publish(sids: string[], gone: SquadRecord[] = []): Promise<void> {
  const s = await getSettings();
  const live = trainerLive(s);
  if (!live || (sids.length === 0 && gone.length === 0)) return;
  const state = stateOf(s, await getPlayers());
  const now = Date.now();
  for (const rec of gone) await send(live, rec);
  for (const sid of new Set(sids)) {
    const squad = state.squads.find((q) => q.sid === sid);
    const rec = squad && buildRecord(state, squad.id, liveTeams(live), now);
    if (rec) await send(live, rec);
  }
}

/** R-B5: Kinder speichern; Änderungen an geteilten Kadern werden gestempelt und gehen hinaus. */
export async function savePlayers(next: Player[]): Promise<Player[]> {
  const r = await serial(async () => {
    const s = await getSettings();
    const state = stateOf(s, await getPlayers());
    const out = stamp(state, { ...state, players: next }, Date.now());
    await putPlayers(out.state.players);
    return out;
  });
  if (r.changed.length > 0) void publish(r.changed).catch(() => undefined);
  return r.state.players;
}

/** R-B5: Einstellungen speichern (Kader, Schalter, Mannschaften); geteilte Änderungen gehen hinaus. */
export async function saveSettings(next: Settings): Promise<Settings> {
  const r = await serial(async () => {
    const prev = await getSettings();
    const players = await getPlayers();
    const out = stamp(stateOf(prev, players), stateOf(next, players), Date.now());
    const settings: Settings = { ...next, squads: squadsField(next, out.state.squads), teams: out.state.teams };
    await putSettings(settings);
    if (out.state.players !== players && out.state.players.some((x, i) => x !== players[i]))
      await putPlayers(out.state.players);
    return { settings, out };
  });
  if (r.out.changed.length > 0 || r.out.gone.length > 0) void publish(r.out.changed, r.out.gone).catch(() => undefined);
  return r.settings;
}

/** FR-B02: Kader mit Kindern, die noch nicht geteilt sind, für die Frage vor "Trainer-Link teilen". */
export async function unsharedSquads(): Promise<{
  squads: { id: string; name: string; count: number; shared: boolean }[];
}> {
  const s = await getSettings();
  const players = await getPlayers();
  return {
    squads: squadsOf(s).map((q) => ({
      id: q.id,
      name: q.name,
      count: inSquad(squadsOf(s), players, q.id).length,
      shared: q.shared === true,
    })),
  };
}

/** FR-B02: Schalter wie angekreuzt setzen (nur Kader mit Kindern werden angeboten). */
export async function setSquadShares(shared: Record<string, boolean>): Promise<Settings> {
  const s = await getSettings();
  const squads = squadsOf(s).map((q) => (q.id in shared ? { ...q, shared: shared[q.id] === true } : q));
  const next = await saveSettings({ ...s, squads });
  squadsChanged();
  return next;
}

/* ---------- Empfangen (R-B6) ---------- */

let welcomeTimer: ReturnType<typeof setTimeout> | undefined;

/** FR-B09: einmal "Kader übernommen: …" mit allen geteilten Kadern. */
function welcome(): void {
  clearTimeout(welcomeTimer);
  welcomeTimer = setTimeout(() => {
    void serial(async () => {
      const s = await getSettings();
      const live = trainerLive(s);
      if (!live || s.squadSync?.topic !== live.topic || s.squadSync.welcomed) return;
      const players = await getPlayers();
      const squads = squadsOf(s);
      const list = squads
        .filter((q) => q.shared)
        .map((q) => {
          const n = inSquad(squads, players, q.id).length;
          return `${q.name} (${n} ${n === 1 ? 'Kind' : 'Kinder'})`;
        });
      await putSettings({ ...s, squadSync: { ...s.squadSync, welcomed: true } });
      if (list.length > 0) squadNotice(`Kader übernommen: ${list.join(', ')}`);
    });
  }, 1500);
}

/** Eine Meldung, die der Zuschauer-Schlüssel nicht öffnet: vielleicht ein geteilter Kader. */
export function receiveSquad(text: string, view: { topic: string; orgPub: string }): Promise<void> {
  return serial(async () => {
    const s = await getSettings();
    const live = trainerLive(s);
    if (!live || live.topic !== view.topic || live.orgPub !== view.orgPub) return [];
    const plain = await unsealSquad(live.orgKey, text);
    const rec = plain === null ? null : parseRecord(plain);
    if (!rec) return [];
    known.set(rec.s, Math.max(known.get(rec.s) ?? 0, recordAt(rec)));
    const players = await getPlayers();
    const r = mergeRecord(stateOf(s, players), rec, liveTeams(live), Date.now(), newId);
    const sync = s.squadSync?.topic === live.topic ? s.squadSync : undefined;
    const base = sync ?? { topic: live.topic, orgPub: live.orgPub, full: [], welcomed: false };
    const full = r.full ? [...new Set([...base.full, r.full])] : base.full.filter((n) => !(r.adopted && n === rec.n));
    const syncChanged = !sync || full.length !== base.full.length;
    if (r.changed || syncChanged) {
      if (r.state.players !== players) await putPlayers(r.state.players);
      const next: Settings = {
        ...s,
        squads: squadsField(s, r.state.squads),
        teams: r.state.teams,
        squadSync: { ...base, full },
      };
      await putSettings(next);
      liveSettingsChanged(next);
      squadsChanged();
    }
    if (r.adopted && !base.welcomed) welcome();
    return r.republish;
  })
    .then((sids) => publish(sids))
    .catch(() => undefined);
}

/** Nach dem ersten Stand vom Dienst: was hier neuer ist als dort, geht hinaus (auch nach "neu ausgestellt"). */
async function catchUp(): Promise<void> {
  const s = await getSettings();
  const live = trainerLive(s);
  if (!live) return;
  const state = stateOf(s, await getPlayers());
  const now = Date.now();
  const stale = state.squads
    .filter((q) => q.shared && q.sid)
    .filter((q) => {
      const rec = buildRecord(state, q.id, liveTeams(live), now);
      return rec !== null && recordAt(rec) > (known.get(q.sid!) ?? 0);
    })
    .map((q) => q.sid!);
  await serial(() => publish(stale));
}

/* ---------- Verbindung, solange die App sichtbar ist ---------- */

let receiver: LiveReceiver | null = null;
let topic = '';

function stop(): void {
  receiver?.stop();
  receiver = null;
  topic = '';
}

/** R-B6: Trainer-Handys halten die Verbindung und übernehmen Konfiguration, Spielplan und Kader. */
export function syncTrainer(s: Settings, visible: boolean): void {
  const live = trainerLive(s);
  if (!live || !visible) return stop();
  if (receiver && topic === `${live.topic}.${live.orgPub}`) return;
  stop();
  known.clear();
  const view = viewerOf(live);
  topic = `${live.topic}.${live.orgPub}`;
  const r = newReceiver(
    view,
    {
      onConfig: (signed) => void adoptReceived(signed, live),
      onPlan: (payload, sentAt) => void adoptPlan(payload, live, sentAt),
      onSealed: (text) => void receiveSquad(text, live),
    },
    configOf(live.config),
  );
  receiver = r;
  r.start();
  void r.whenSettled(15_000).then(() => {
    if (receiver === r) void catchUp().catch(() => undefined);
  });
}
