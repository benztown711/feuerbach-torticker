import {
  addEntry,
  claimLabel,
  chunkEntries,
  deleteEntry,
  encodePayload,
  entryDetail,
  entryTitle,
  entryWhen,
  formatPlanDateShort,
  matchText,
  markSent,
  mergeEntries,
  needsRefresh,
  noteSeen,
  parsePayload,
  parsePayloadValue,
  myClaims,
  pickable,
  planFor,
  prunePlan,
  setCancelled,
  setClaim,
  setGame,
  setScore,
  staleEntries,
  todayKey,
  trainerName,
  updateEntry,
  type PlanInput,
} from '../domain/plan';
import { importPlan } from '../domain/plan-list';
import { MAX_PLAN_SIGNED } from '../domain/live-validate';
import type { BackupPlan } from '../domain/export';
import type { LiveSpieltag, PlanEntry, PlanStore, Score } from '../domain/types';
import { getPlan, getSettings, putPlan, putSettings } from './db';
import { sealMessage, signData } from './live-crypto';
import { planChanged } from './live-events';
import { sendOrg } from './relay-write';

/**
 * Spec 015 US1: Spielplan laden, ändern, senden und von anderen Trainer-Handys übernehmen (plan.md, R-P1 bis
 * R-P4). Wird nachgeladen.
 */

export type PlanEdit =
  | { kind: 'add'; input: PlanInput }
  | { kind: 'update'; id: string; input: PlanInput }
  | { kind: 'cancel'; id: string; cancelled: boolean }
  | { kind: 'delete'; id: string }
  | { kind: 'link'; id: string; gameId: string }
  /** US4: Zeilen aus "Liste einfügen"; vorhandene Spiele werden aktualisiert (FR-P17). */
  | { kind: 'import'; inputs: PlanInput[] }
  /** US6: "Ich tickere" (true) bzw. "Nicht mehr tickern"; `name` beim ersten Vormerken (FR-P26). */
  | { kind: 'claim'; id: string; claim: boolean; name?: string };

/** US2: Planspiel zur Auswahl unter "Neues Spiel", mit fertigen Beschriftungen. */
export interface PlanChoice {
  entry: PlanEntry;
  /** "E1 – TSV Musterstadt" */
  title: string;
  /** "Heim · Kreisstaffel · 2×25" */
  detail: string;
  /** "Sa 14.11., 12:00" */
  when: string;
  /** "Sa 14." */
  day: string;
  /** US6: Vormerkung ("du", Name, "vergeben"), leer = frei. */
  claim: string;
  /** US6: "E1 gegen TSV Musterstadt" (Startbildschirm). */
  match: string;
}

let queue: Promise<unknown> = Promise.resolve();

/** Änderungen, Übernahmen und Senden nacheinander, damit nichts überschrieben wird. */
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

const newId = (): string => crypto.randomUUID().replace(/-/g, '').slice(0, 8);

/** Plan dieses Live-Spieltags, ohne alte Grabsteine (R-P3). */
export async function loadPlan(live: Pick<LiveSpieltag, 'topic' | 'orgPub'>): Promise<PlanStore> {
  return prunePlan(planFor(await getPlan(), live.topic, live.orgPub), todayKey(Date.now()));
}

async function save(store: PlanStore): Promise<PlanStore> {
  await putPlan(store);
  planChanged(store);
  return store;
}

/**
 * US6: Kennung dieses Handys (beim ersten Mal angelegt) und Vorname für die Trainer; `name` speichert einen neuen
 * Vornamen (FR-P26, auch leer = ohne Namen, dann fragt die App nicht mehr).
 */
async function identity(name?: string): Promise<{ me: string; name: string }> {
  const s = await getSettings();
  const me = s.deviceId ?? crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const next = name === undefined ? (s.trainerName ?? '') : trainerName(name);
  if (s.deviceId !== me || s.trainerName !== next) await putSettings({ ...s, deviceId: me, trainerName: next });
  return { me, name: next };
}

function apply(store: PlanStore, edit: PlanEdit, now: number, me: { me: string; name: string }): PlanStore | null {
  switch (edit.kind) {
    case 'add':
      return addEntry(store, edit.input, newId(), now).store;
    case 'update':
      return updateEntry(store, edit.id, edit.input, now)?.store ?? null;
    case 'cancel':
      return setCancelled(store, edit.id, edit.cancelled, now)?.store ?? null;
    case 'delete':
      return deleteEntry(store, edit.id, now)?.store ?? null;
    case 'link':
      return setGame(store, edit.id, edit.gameId, now)?.store ?? null;
    case 'import':
      return importPlan(store, edit.inputs, todayKey(now), now, newId).store;
    case 'claim': {
      // Schon so vorgemerkt bzw. frei: nichts zu senden, aber auch kein Fehler.
      // Schon so vorgemerkt bzw. frei: derselbe Stand (nichts zu speichern oder zu senden).
      const r = setClaim(store, edit.id, edit.claim ? me.me : '', me.name, now);
      const entry = store.entries.find((e) => e.id === edit.id && !e.deleted && !e.cancelled);
      return r ? r.store : entry ? store : null;
    }
  }
}

/** Sendet Planspiele in Stücken; false, sobald ein Stück nicht ankommt. */
async function sendEntries(live: LiveSpieltag, entries: readonly PlanEntry[]): Promise<boolean> {
  if (!live.orgKey) return false;
  for (const chunk of chunkEntries(entries, MAX_PLAN_SIGNED)) {
    const plan = await signData(live.orgKey, encodePayload(chunk));
    const ok = await sendOrg(live, { kind: 'plan', body: await sealMessage(live.viewKey, { plan }) }).catch(
      () => false,
    );
    if (!ok) return false;
  }
  return true;
}

/** Sendet Unversandtes und Planspiele ab heute, die seit 6 Stunden nicht über den Dienst gingen (FR-P07). */
function flush(): Promise<boolean> {
  return serial(async () => {
    const live = (await getSettings()).live;
    if (!live?.orgKey) return false;
    const store = await loadPlan(live);
    const now = Date.now();
    const ids = new Set([...store.pending, ...staleEntries(store, now, todayKey(now)).map((e) => e.id)]);
    const entries = store.entries.filter((e) => ids.has(e.id));
    // Unversandtes, das es nicht mehr gibt (gekürzt), nicht ewig mitschleppen.
    if (entries.length === 0) {
      if (store.pending.length > 0) await putPlan({ ...store, pending: [] });
      return true;
    }
    if (!(await sendEntries(live, entries))) return false;
    await putPlan(markSent(await loadPlan(live), [...ids], Date.now()));
    return true;
  });
}

/** US1-S1 bis S3, S7, US4: ändern, speichern und an die anderen Trainer-Handys senden. */
export async function changePlan(edit: PlanEdit): Promise<PlanStore> {
  const { store, changed } = await serial(async () => {
    const live = (await getSettings()).live;
    if (!live?.orgKey) throw new Error('Nur Trainer-Handys mit Trainer-Link können den Spielplan ändern.');
    const me = edit.kind === 'claim' ? await identity(edit.name) : { me: '', name: '' };
    const before = await loadPlan(live);
    const next = apply(before, edit, Date.now(), me);
    if (!next) throw new Error('Dieses Spiel gibt es nicht mehr im Spielplan.');
    return next === before ? { store: before, changed: false } : { store: await save(next), changed: true };
  });
  if (changed) void flush().catch(() => false);
  return store;
}

const choiceOf = (entry: PlanEntry, me: string): PlanChoice => ({
  entry,
  title: entryTitle(entry),
  detail: entryDetail(entry),
  when: entryWhen(entry),
  day: formatPlanDateShort(entry.date),
  claim: claimLabel(entry, me),
  match: matchText(entry),
});

/** US2 FR-P09: heutige und kommende Planspiele (14 Tage) für "Aus dem Spielplan". */
export async function planChoices(
  live: Pick<LiveSpieltag, 'topic' | 'orgPub'>,
): Promise<{ today: PlanChoice[]; later: PlanChoice[] }> {
  const r = pickable(await loadPlan(live), todayKey(Date.now()));
  const me = (await getSettings()).deviceId ?? '';
  return { today: r.today.map((e) => choiceOf(e, me)), later: r.later.map((e) => choiceOf(e, me)) };
}

/** US6-S5 FR-P28: eigene Vormerkungen von heute für den Startbildschirm ("Heute tickerst du"). */
export async function todayClaims(live: Pick<LiveSpieltag, 'topic' | 'orgPub'>): Promise<PlanChoice[]> {
  const me = (await getSettings()).deviceId ?? '';
  return myClaims(await loadPlan(live), todayKey(Date.now()), me).map((e) => choiceOf(e, me));
}

/** US2 FR-P11: das angelegte Spiel im Planspiel vermerken ("angelegt"), auch für die anderen Trainer-Handys. */
export async function linkPlanGame(id: string, gameId: string): Promise<void> {
  try {
    await changePlan({ kind: 'link', id, gameId });
  } catch {
    // Planspiel inzwischen gelöscht oder Handy ohne Trainer-Link: das Spiel läuft trotzdem.
  }
}

/**
 * US3 FR-P30 (R-P8): Endstand des aus dem Plan angelegten Spiels ins Planspiel übernehmen und senden; null nimmt
 * ihn zurück (zurückgenommener Schlusspfiff). Ohne passendes Planspiel oder ohne Trainer-Link passiert nichts.
 */
export async function notePlanScore(gameId: string, score: Score | null): Promise<void> {
  try {
    const changed = await serial(async () => {
      const live = (await getSettings()).live;
      if (!live?.orgKey) return false;
      const r = setScore(await loadPlan(live), gameId, score, Date.now());
      if (r) await save(r.store);
      return r !== null;
    });
    if (changed) void flush().catch(() => false);
  } catch {
    // Speicher nicht erreichbar: beim nächsten Schlusspfiff bzw. Öffnen erneut.
  }
}

/** FR-P24: höchstens so viele Planspiele (mit Grabsteinen) aus einer Sicherung. */
const MAX_BACKUP_ENTRIES = 1000;

/** FR-P24: Spielplan dieses Live-Spieltags für die Sicherung (Nutzlast wie die Plan-Meldung). */
export async function planBackup(): Promise<BackupPlan | undefined> {
  const live = (await getSettings()).live;
  if (!live) return undefined;
  const store = planFor(await getPlan(), live.topic, live.orgPub);
  return store.entries.length === 0
    ? undefined
    : { topic: live.topic, orgPub: live.orgPub, p: encodePayload(store.entries) };
}

/**
 * FR-P24: Spielplan aus der Sicherung übernehmen, nur beim selben Live-Spieltag; je Planspiel die jüngere Änderung.
 * Gesendet wird nicht sofort: veraltete Planspiele schickt das Handy beim nächsten Öffnen (FR-P07).
 */
export function restorePlan(plan: BackupPlan): Promise<'merged' | 'other' | 'invalid'> {
  return serial(async () => {
    const live = (await getSettings()).live;
    if (live?.topic !== plan.topic || live.orgPub !== plan.orgPub) return 'other' as const;
    const entries = parsePayloadValue(plan.p, MAX_BACKUP_ENTRIES);
    if (!entries) return 'invalid' as const;
    const r = mergeEntries(await loadPlan(live), entries);
    if (r.changed.length > 0) await save(prunePlan(r.store, todayKey(Date.now())));
    return 'merged' as const;
  });
}

/** FR-P07: beim Öffnen Unversandtes und veraltete Planspiele ab heute senden. */
export async function refreshPlan(): Promise<void> {
  try {
    const live = (await getSettings()).live;
    if (!live?.orgKey) return;
    const now = Date.now();
    if (needsRefresh(await loadPlan(live), now, todayKey(now))) await flush();
  } catch {
    // Ohne Netz oder bei Fehlern beim nächsten Öffnen erneut.
  }
}

/**
 * US1-S4: geprüfte Planspiele eines anderen Trainer-Handys übernehmen (je Planspiel die jüngere Änderung).
 * `sentAt`: Sendezeit der Meldung; eine beim Öffnen nachgelesene alte Meldung gilt nicht als frisch (FR-P07).
 */
export function adoptPlan(
  payload: string,
  view: { topic: string; orgPub: string },
  sentAt: number = Date.now(),
): Promise<void> {
  return serial(async () => {
    const entries = parsePayload(payload);
    if (!entries) return;
    const live = (await getSettings()).live;
    if (live?.topic !== view.topic || live.orgPub !== view.orgPub) return;
    const now = Date.now();
    const r = mergeEntries(await loadPlan(live), entries);
    // Was so auf dem Dienst steht wie bei uns, muss dieses Handy erst 6 Stunden nach dem Senden erneut senden (FR-P07).
    const next = noteSeen(r.store, entries, Math.min(sentAt, now));
    if (r.changed.length > 0) await save(prunePlan(next, todayKey(now)));
    else await putPlan(next);
  }).catch(() => undefined);
}

/** Neu ausstellen: der Plan wandert auf den neuen Live-Spieltag und geht dort ganz hinaus (Spec, Edge Cases). */
export async function movePlan(old: Pick<LiveSpieltag, 'topic' | 'orgPub'>, next: LiveSpieltag): Promise<void> {
  await serial(async () => {
    const store = planFor(await getPlan(), old.topic, old.orgPub);
    if (store.entries.length === 0) return;
    await save({ ...store, topic: next.topic, orgPub: next.orgPub, seen: {}, pending: [] });
  });
  await flush();
}
