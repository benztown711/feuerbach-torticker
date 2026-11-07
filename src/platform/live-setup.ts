import {
  linkUrl,
  shortTrainerLinkPath,
  viewerLinkPath,
  type LeadLinkData,
  type ParsedLink,
  type ShortTrainerData,
  type TrainerLinkData,
} from '../domain/live-link';
import {
  applyLeadLink,
  applyTrainerLink,
  configOf,
  createSpieltag,
  parseConfig,
  parseLeadCert,
  titleOf,
  trainerLinkFor,
  trainerTeamsOf,
  viewerOf,
  type LiveDeps,
  type LiveInput,
} from '../domain/live-spieltag';
import {
  addLiveTeam,
  adoptConfig,
  detailsOf,
  removeLiveTeam,
  renameSpieltag,
  reissueSpieltag,
  restoreLive,
  retireConfig,
} from '../domain/live-manage';
import type { LiveTeamOption } from '../domain/live-spieltag';
import type { LeadCert, LiveConfig, LiveSpieltag, PrivateKeyParts, Settings, SignedData } from '../domain/types';
import { getSettings, putSettings } from './db';
import { newSigningKey, newTopic, newViewKey, sealMessage, sign, signData, verify, verifySigned } from './live-crypto';
import { liveSettingsChanged } from './live-events';
import { startLiveSender } from './live-sender';
import { movePlan } from './plan-sync';

// Spec 015: über dieses (nachgeladene) Modul erreichbar, damit der Spielplan-Code nicht ins Hauptbundle rutscht.
export {
  adoptPlan,
  changePlan,
  linkPlanGame,
  loadPlan,
  notePlanScore,
  planChoices,
  refreshPlan,
  todayClaims,
  type PlanChoice,
  type PlanEdit,
} from './plan-sync';
import { publish } from './relay';
import { shareText, type ShareResult } from './share';

/** Spec 006 US1: Live-Spieltag anlegen, Links teilen, Lead-Link prüfen und koppeln. */

const deps = (): LiveDeps => ({
  now: Date.now(),
  newTopic,
  newViewKey,
  newSigningKey,
  signData,
  newId: () => crypto.randomUUID(),
});

/** Sendet die Konfiguration (Titel, Mannschaften), damit Zuschauer sie sofort haben (FR-L19). */
export async function publishConfig(live: LiveSpieltag): Promise<boolean> {
  return publish(live.topic, await sealMessage(live.viewKey, { config: live.config }));
}

/** FR-L01: anlegen und speichern; ersetzt einen bisherigen Live-Spieltag dieses Geräts. */
export async function createLive(input: LiveInput): Promise<Settings> {
  const settings = await getSettings();
  const live = await createSpieltag(input, settings.teams, deps());
  const next = { ...settings, live };
  await putSettings(next);
  void publishConfig(live);
  void startLiveSender(next);
  return next;
}

export interface VerifiedLead {
  cert: LeadCert;
  /** Geprüfte Konfiguration; ihr Titel gilt (nicht der ungeprüfte Titel im Link). */
  config: LiveConfig;
}

/** Passt der private Schlüssel im Link zum öffentlichen Schlüssel? */
async function keyMatches(priv: PrivateKeyParts, pub: string): Promise<boolean> {
  try {
    const probe = `probe:${pub}`;
    return await verify(pub, probe, await sign(priv, probe));
  } catch {
    return false;
  }
}

/**
 * Prüft einen Lead-Link: Zertifikat und Konfiguration vom Organisator signiert, die Mannschaft steht in
 * der Konfiguration, und der private Schlüssel gehört zum Zertifikat (sonst würden alle Meldungen verworfen).
 */
export async function verifyLeadLink(lead: LeadLinkData): Promise<VerifiedLead | null> {
  const cert = parseLeadCert(await verifySigned(lead.view.orgPub, lead.cert));
  const config = parseConfig(await verifySigned(lead.view.orgPub, lead.config));
  if (!cert || !config || !config.teams.includes(cert.key)) return null;
  return (await keyMatches(lead.key, cert.pub)) ? { cert, config } : null;
}

/**
 * Prüft einen Trainer-Link: Konfiguration vom Organisator signiert, der private Schlüssel gehört zum
 * Organisator-Schlüssel und mindestens eine Mannschaft des Links steht in der Konfiguration.
 */
export async function verifyTrainerLink(trainer: TrainerLinkData): Promise<LiveConfig | null> {
  const config = parseConfig(await verifySigned(trainer.view.orgPub, trainer.config));
  if (!config || trainerTeamsOf(trainer).length === 0) return null;
  return (await keyMatches(trainer.orgKey, trainer.view.orgPub)) ? config : null;
}

/** Geprüfter Trainer- oder Lead-Link mit Titel und Mannschaften für die Rückfrage (FR-L03). */
export type VerifiedLink =
  | { kind: 'lead'; lead: LeadLinkData; cert: LeadCert; title: string; teams: { name: string }[] }
  | { kind: 'trainer'; trainer: TrainerLinkData; title: string; teams: { name: string }[] };

/**
 * Kurzer Trainer-Link (research.md R-L20): Die Konfiguration kommt ohne Signatur; das Handy signiert sie mit dem
 * Organisator-Schlüssel aus dem Link. Danach gelten dieselben Prüfungen wie beim langen Link, vor allem, dass
 * der Schlüssel zum öffentlichen Schlüssel des Zuschauer-Links gehört.
 */
async function fromShort(s: ShortTrainerData): Promise<TrainerLinkData | null> {
  try {
    const config = await signData(s.orgKey, s.config);
    const teams = s.teams.map(([key, name, homeColor, awayColor]) => ({ key, name, homeColor, awayColor }));
    return { view: s.view, orgKey: s.orgKey, config, teams };
  } catch {
    return null;
  }
}

/** Prüft einen eingefügten oder angetippten Trainer- bzw. Lead-Link; sonst null. */
export async function verifyLink(link: ParsedLink): Promise<VerifiedLink | null> {
  if (link.kind === 'trainerShort') {
    const trainer = await fromShort(link.short);
    return trainer ? verifyLink({ kind: 'trainer', trainer }) : null;
  }
  if (link.kind === 'trainer') {
    const config = await verifyTrainerLink(link.trainer);
    return config
      ? { kind: 'trainer', trainer: link.trainer, title: config.title, teams: trainerTeamsOf(link.trainer) }
      : null;
  }
  if (link.kind !== 'lead') return null;
  const v = await verifyLeadLink(link.lead);
  return v ? { kind: 'lead', lead: link.lead, cert: v.cert, title: v.config.title, teams: [v.cert] } : null;
}

/** Zuschauerteil des Links (für die Frage, ob es derselbe Live-Spieltag ist). */
export const linkOf = (v: VerifiedLink): { view: LeadLinkData['view'] } => (v.kind === 'lead' ? v.lead : v.trainer);

/** FR-L03: Trainer-Handy werden (fehlende Mannschaften werden übernommen). */
export async function coupleTrainer(trainer: TrainerLinkData): Promise<Settings> {
  const next = await applyTrainerLink(await getSettings(), trainer, deps());
  await putSettings(next);
  void startLiveSender(next);
  return next;
}

/** FR-L03: Kopplung speichern (Mannschaft wird bei Bedarf in "Meine Mannschaften" übernommen). */
export async function coupleLead(lead: LeadLinkData, cert: LeadCert): Promise<Settings> {
  const next = applyLeadLink(await getSettings(), lead, cert, { now: Date.now(), newId: () => crypto.randomUUID() });
  await putSettings(next);
  void startLiveSender(next);
  return next;
}

/** Basisadresse der App, z. B. https://benztown711.github.io/feuerbach-torticker/ */
export const appBase = (): string => `${window.location.origin}${import.meta.env.BASE_URL}`;

export function viewerLinkUrl(live: LiveSpieltag): string {
  return linkUrl(appBase(), viewerLinkPath(viewerOf(live)));
}

/** FR-L02: Zuschauer-Link für die Elterngruppe. */
export function shareViewerLink(live: LiveSpieltag): Promise<ShareResult> {
  const title = titleOf(live);
  return shareText(`${title} live verfolgen: ${viewerLinkUrl(live)}`, title);
}

/** FR-L02: kurzer Trainer-Link (research.md R-L20); null ohne Organisator-Schlüssel. */
export function trainerLinkUrl(live: LiveSpieltag): string | null {
  const trainer = trainerLinkFor(live);
  const config = configOf(live.config);
  if (!trainer || !config) return null;
  const teams = detailsOf(trainer.teams);
  return linkUrl(appBase(), shortTrainerLinkPath({ view: trainer.view, orgKey: trainer.orgKey, config, teams }));
}

/** FR-L02: Trainer-Link für die Trainergruppe (senden für alle Mannschaften, verwalten). */
export function shareTrainerLink(live: LiveSpieltag): Promise<ShareResult> {
  const url = trainerLinkUrl(live);
  if (!url) return Promise.resolve('failed');
  // Kurz halten: WhatsApp macht lange Nachrichten mit Link schlecht antippbar (research.md R-L20).
  const text = `Trainer-Link für "${titleOf(live)}", nur für die Trainergruppe. Antippen und loslegen:\n${url}`;
  return shareText(text, `Trainer-Link ${titleOf(live)}`);
}

/** FR-L03: koppelt mit einem geprüften Link. */
export const coupleLink = (v: VerifiedLink): Promise<Settings> =>
  v.kind === 'lead' ? coupleLead(v.lead, v.cert) : coupleTrainer(v.trainer);

/* ---------- Spec 006 US5: verwalten und von anderen Trainer-Handys übernehmen ---------- */

/** Speichert, startet bzw. aktualisiert den Sender und meldet die Änderung an offene Bildschirme. */
async function save(next: Settings, publishNow: boolean): Promise<Settings> {
  await putSettings(next);
  // Zuschauer und andere Trainer-Handys erfahren Titel und Mannschaften sofort (FR-L19).
  if (publishNow && next.live) void publishConfig(next.live).catch(() => false);
  void startLiveSender(next);
  liveSettingsChanged(next);
  return next;
}

let queue: Promise<unknown> = Promise.resolve();

/** Änderungen am Live-Spieltag nacheinander, damit Verwalten und Übernehmen sich nicht überschreiben. */
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function manage(change: (live: LiveSpieltag) => Promise<LiveSpieltag>): Promise<Settings> {
  return serial(async () => {
    const s = await getSettings();
    if (!s.live) throw new Error('Auf diesem Handy ist kein Live-Spieltag eingerichtet.');
    return save({ ...s, live: await change(s.live) }, true);
  });
}

/** US5-S4: Titel ändern. */
export const renameLive = (title: string): Promise<Settings> => manage((live) => renameSpieltag(live, title, deps()));

/** US5-S1: Mannschaft aus "Meine Mannschaften" hinzufügen; die Links bleiben gleich. */
export const addTeamToLive = (option: LiveTeamOption): Promise<Settings> =>
  manage((live) => addLiveTeam(live, option, deps()));

/** Mannschaft entfernen. */
export const removeTeamFromLive = (key: string): Promise<Settings> =>
  manage((live) => removeLiveTeam(live, key, deps()));

/**
 * US5-S3: alle Links neu ausstellen (neues Topic, neue Schlüssel). Auf dem alten Topic geht danach einmal der
 * Hinweis "neu ausgestellt" hinaus, ohne die neuen Links (Variante C, research.md R-L17).
 */
export async function reissueLive(): Promise<Settings> {
  const old = (await getSettings()).live;
  const next = await manage((live) => reissueSpieltag(live, deps()));
  if (old) void announceRetired(old, await retireConfig(old, deps()));
  // Spec 015: der Spielplan wandert mit.
  if (old && next.live) void movePlan(old, next.live).catch(() => undefined);
  return next;
}

/** Hinweis "neu ausgestellt" aufs alte Topic; ohne Netz erneut (5 s, 10 s, … bis gut 10 Minuten). */
async function announceRetired(old: LiveSpieltag, retired: SignedData): Promise<void> {
  const text = await sealMessage(old.viewKey, { config: retired });
  for (let wait = 5_000; wait <= 320_000; wait *= 2) {
    if (await publish(old.topic, text).catch(() => false)) return;
    await new Promise((r) => setTimeout(r, wait));
  }
}

/** US5-S2 FR-L20: Kopplung beenden; die Spiele bleiben auf dem Handy. */
export function endCoupling(): Promise<Settings> {
  return serial(async () => save({ ...(await getSettings()), live: null }, false));
}

/**
 * US5-S1: übernimmt eine empfangene, mit `view.orgPub` geprüfte jüngere Konfiguration in den Live-Spieltag
 * dieses Handys, nacheinander statt parallel. Hat das Handy inzwischen einen anderen Live-Spieltag (z. B. neu
 * ausgestellt), bleibt alles, wie es ist.
 */
export function adoptReceived(signed: SignedData, view: { topic: string; orgPub: string }): Promise<void> {
  return serial(async () => {
    const s = await getSettings();
    if (s.live?.topic !== view.topic || s.live.orgPub !== view.orgPub) return;
    const next = await adoptConfig(s, signed, deps());
    if (next) await save(next, false);
  }).catch(() => undefined);
}

/**
 * FR-L21: Live-Spieltag aus einer Sicherung übernehmen, nur wenn das Handy noch keinen hat. Die Konfiguration
 * muss vom Organisator signiert sein und ein mitgesicherter Organisator-Schlüssel zu ihm passen.
 */
export async function restoreLiveFromBackup(live: LiveSpieltag): Promise<'restored' | 'kept' | 'invalid'> {
  const config = parseConfig(await verifySigned(live.orgPub, live.config));
  if (!config || (live.orgKey && !(await keyMatches(live.orgKey, live.orgPub)))) return 'invalid';
  return serial(async () => {
    const r = restoreLive(await getSettings(), live, () => crypto.randomUUID(), Date.now());
    if (!r.restored) return 'kept';
    await save(r.settings, false);
    return 'restored';
  });
}
