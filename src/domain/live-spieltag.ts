import { teamShortLabel } from './history';
import { isPaletteColor } from './jersey-colors';
import type { LeadLinkData, TrainerLinkData, TrainerTeam } from './live-link';
import {
  isKey,
  isObj,
  isPrivateKeyParts,
  isSignedData,
  isText,
  isTime,
  isTopic,
  MAX_KEY,
  MAX_LIVE_TEAMS,
  MAX_TITLE,
} from './live-validate';
import { KEEP_PER_GROUP } from './relay-protocol';
import { normalizeName } from './validation';
import type {
  Game,
  LeadCert,
  LiveConfig,
  LiveSpieltag,
  LiveTeamCred,
  PrivateKeyParts,
  Settings,
  SignedData,
  Team,
  TeamDetail,
  ViewerLink,
} from './types';

/** Spec 006: Live-Spieltag anlegen, koppeln und Spiele zuordnen (FR-L01 bis FR-L04, FR-L06, FR-L09). */

export { MAX_LIVE_TEAMS };
export const DEFAULT_LIVE_TITLE = 'Unser Spieltag';

/** Schlüssel und Signaturen kommen von außen (Web Crypto in der Plattform, Fakes in Tests). */
export interface LiveDeps {
  now: number;
  newTopic(): string;
  newViewKey(): string;
  newSigningKey(): Promise<{ pub: string; priv: PrivateKeyParts }>;
  signData(priv: PrivateKeyParts, value: unknown): Promise<SignedData>;
  newId(): string;
}

export interface LiveTeamOption {
  key: string;
  team: Team;
}

/** Mannschaften mit eindeutigem Kurzlabel ("E1", bei Doppelung "E1 (2)"). */
export function liveTeamOptions(teams: Team[]): LiveTeamOption[] {
  const seen = new Map<string, number>();
  return teams.map((team) => {
    const base = teamShortLabel(team.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { key: n === 1 ? base : `${base} (${n})`, team };
  });
}

export interface LiveInput {
  title: string;
  teamIds: string[];
}

export interface LiveInputCheck {
  ok: boolean;
  title: string;
  errors: Partial<Record<'title' | 'teams', string>>;
}

/** Titel eines Live-Spieltags: Leerzeichen zusammengezogen, 1 bis 40 Zeichen (FR-L01, FR-L19). */
export function checkTitle(raw: string): { ok: boolean; title: string; error?: string } {
  const title = raw.trim().replace(/\s+/g, ' ');
  if (title.length === 0) return { ok: false, title, error: 'Bitte einen Titel eintragen.' };
  if (title.length > MAX_TITLE) return { ok: false, title, error: 'Höchstens 40 Zeichen.' };
  return { ok: true, title };
}

export function validateLiveInput(input: LiveInput, teams: Team[]): LiveInputCheck {
  const { title, error } = checkTitle(input.title);
  const errors: LiveInputCheck['errors'] = {};
  if (error) errors.title = error;
  const known = input.teamIds.filter((id) => teams.some((t) => t.id === id));
  if (known.length === 0) errors.teams = 'Bitte mindestens eine Mannschaft wählen.';
  else if (known.length > MAX_LIVE_TEAMS) errors.teams = 'Höchstens 6 Mannschaften.';
  if (known.length !== input.teamIds.length) errors.teams ??= 'Unbekannte Mannschaft.';
  return { ok: Object.keys(errors).length === 0, title, errors };
}

/**
 * FR-L01, FR-L02: legt Schlüssel, Konfiguration und je Mannschaft ein Lead-Zertifikat an.
 * Das anlegende Handy ist Trainer-Handy und sendet je Spiel für alle Mannschaften (FR-L04).
 */
export async function createSpieltag(input: LiveInput, teams: Team[], deps: LiveDeps): Promise<LiveSpieltag> {
  const check = validateLiveInput(input, teams);
  if (!check.ok) throw new Error(Object.values(check.errors).join(' '));
  const org = await deps.newSigningKey();
  const chosen = liveTeamOptions(teams).filter((o) => input.teamIds.includes(o.team.id));
  const config: LiveConfig = {
    title: check.title,
    teams: chosen.map((o) => o.key),
    iat: deps.now,
    m: chosen.map(({ key, team }) => [key, team.name, team.homeColor, team.awayColor]),
  };
  const creds: LiveTeamCred[] = [];
  for (const { key, team } of chosen) {
    const lead = await deps.newSigningKey();
    const cert: LeadCert = {
      key,
      name: team.name,
      homeColor: team.homeColor,
      awayColor: team.awayColor,
      pub: lead.pub,
      iat: deps.now,
    };
    creds.push({
      key,
      name: team.name,
      homeColor: team.homeColor,
      awayColor: team.awayColor,
      leadKey: lead.priv,
      cert: await deps.signData(org.priv, cert),
      sends: true,
    });
  }
  return {
    v: 1,
    topic: deps.newTopic(),
    viewKey: deps.newViewKey(),
    orgPub: org.pub,
    orgKey: org.priv,
    config: await deps.signData(org.priv, config),
    teams: creds,
    createdAt: deps.now,
  };
}

export const isOrganizer = (live: LiveSpieltag): boolean => live.orgKey !== undefined;

/**
 * FR-L04: Ein Trainer-Handy (mit Organisator-Schlüssel) sendet für alle Mannschaften, je nach Spiel;
 * ein Lead-Handy der ersten Version nur für seine eingefügten Mannschaften.
 */
export const sendsFor = (live: LiveSpieltag, cred: LiveTeamCred): boolean => cred.sends || isOrganizer(live);

/** Inhalt einer gespeicherten (bereits geprüften) Konfiguration. */
export const configOf = (signed: SignedData): LiveConfig | null => {
  try {
    return parseConfig(JSON.parse(signed.d));
  } catch {
    return null;
  }
};

/** Titel aus der (bereits geprüften) gespeicherten Konfiguration. */
export const titleOf = (live: LiveSpieltag): string => configOf(live.config)?.title ?? DEFAULT_LIVE_TITLE;

export const viewerOf = (live: LiveSpieltag): ViewerLink => ({
  topic: live.topic,
  viewKey: live.viewKey,
  orgPub: live.orgPub,
  title: titleOf(live),
});

/** FR-L02: Trainer-Link nur auf einem Trainer-Handy (mit Organisator-Schlüssel). */
export function trainerLinkFor(live: LiveSpieltag): TrainerLinkData | null {
  if (!live.orgKey) return null;
  return {
    view: viewerOf(live),
    orgKey: live.orgKey,
    config: live.config,
    teams: live.teams.map((t) => ({ key: t.key, name: t.name, homeColor: t.homeColor, awayColor: t.awayColor })),
  };
}

/** Prüft den Inhalt eines Lead-Zertifikats (Signatur prüft die Plattform). */
export function parseLeadCert(v: unknown): LeadCert | null {
  if (!isObj(v) || !isText(v.key, MAX_KEY) || !isText(v.name, MAX_TITLE)) return null;
  if (typeof v.homeColor !== 'string' || !isPaletteColor(v.homeColor)) return null;
  if (typeof v.awayColor !== 'string' || !isPaletteColor(v.awayColor)) return null;
  if (!isKey(v.pub, 65) || !isTime(v.iat)) return null;
  return { key: v.key, name: v.name, homeColor: v.homeColor, awayColor: v.awayColor, pub: v.pub, iat: v.iat };
}

/** Prüft den Inhalt einer Konfiguration (FR-L19). */
export function parseConfig(v: unknown): LiveConfig | null {
  if (!isObj(v) || !isText(v.title, MAX_TITLE) || !Array.isArray(v.teams) || !isTime(v.iat)) return null;
  const teams = v.teams as unknown[];
  if (teams.length === 0 || teams.length > MAX_LIVE_TEAMS || !teams.every((t) => isText(t, MAX_KEY))) return null;
  const config: LiveConfig = { title: v.title, teams: teams as string[], iat: v.iat };
  const m = v.m;
  if (m !== undefined && (!Array.isArray(m) || m.length > MAX_LIVE_TEAMS || !m.every(isTeamDetail))) return null;
  if (v.retired !== undefined && v.retired !== true) return null;
  return {
    ...config,
    ...(m !== undefined ? { m: m as TeamDetail[] } : {}),
    ...(v.retired ? { retired: true } : {}),
  };
}

/** US5: Kurzlabel, Name und zwei Trikotfarben der Palette. */
const isTeamDetail = (v: unknown): v is TeamDetail =>
  Array.isArray(v) &&
  v.length === 4 &&
  isText(v[0], MAX_KEY) &&
  isText(v[1], MAX_TITLE) &&
  typeof v[2] === 'string' &&
  isPaletteColor(v[2]) &&
  typeof v[3] === 'string' &&
  isPaletteColor(v[3]);

/** Zugangsdaten einer Mannschaft aus einer Sicherung (FR-L21). */
function parseCred(v: unknown): LiveTeamCred | null {
  if (!isObj(v) || !isText(v.key, MAX_KEY) || !isText(v.name, MAX_TITLE)) return null;
  if (typeof v.homeColor !== 'string' || !isPaletteColor(v.homeColor)) return null;
  if (typeof v.awayColor !== 'string' || !isPaletteColor(v.awayColor)) return null;
  if (!isPrivateKeyParts(v.leadKey) || !isSignedData(v.cert) || typeof v.sends !== 'boolean') return null;
  const { leadKey, cert } = v;
  return {
    key: v.key,
    name: v.name,
    homeColor: v.homeColor,
    awayColor: v.awayColor,
    leadKey: { d: leadKey.d, x: leadKey.x, y: leadKey.y },
    cert: { d: cert.d, s: cert.s },
    sends: v.sends,
  };
}

/**
 * Spec 006 FR-L21: gespeicherter Live-Spieltag aus einer Sicherung. Prüft den Aufbau; die Signatur der
 * Konfiguration prüft die Plattform beim Wiederherstellen.
 */
export function parseLiveSpieltag(v: unknown): LiveSpieltag | null {
  if (!isObj(v) || v.v !== 1 || !isTopic(v.topic) || !isKey(v.viewKey, 32) || !isKey(v.orgPub, 65)) return null;
  if (v.orgKey !== undefined && !isPrivateKeyParts(v.orgKey)) return null;
  if (!isSignedData(v.config) || !isTime(v.createdAt) || !Array.isArray(v.teams)) return null;
  const teams = (v.teams as unknown[]).map(parseCred);
  if (teams.length > MAX_LIVE_TEAMS || teams.some((t) => t === null)) return null;
  if (new Set(teams.map((t) => t?.key)).size !== teams.length) return null;
  const { orgKey, config } = v;
  return {
    v: 1,
    topic: v.topic,
    viewKey: v.viewKey,
    orgPub: v.orgPub,
    ...(orgKey ? { orgKey: { d: orgKey.d, x: orgKey.x, y: orgKey.y } } : {}),
    config: { d: config.d, s: config.s },
    teams: teams as LiveTeamCred[],
    createdAt: v.createdAt,
  };
}

/** Die jüngere von zwei Konfigurationen (größeres `iat`). */
export function newerConfig(a: LiveConfig | null, b: LiveConfig | null): LiveConfig | null {
  if (!a || !b) return a ?? b;
  return b.iat > a.iat ? b : a;
}

/** Steht die Mannschaft schon in "Meine Mannschaften"? (Name ohne Groß-/Kleinschreibung und Leerzeichen) */
export const knowsTeam = (settings: Settings, name: string): boolean =>
  settings.teams.some((t) => normalizeName(t.name) === normalizeName(name));

export type CouplingKind = 'new' | 'same' | 'replace';

/** Neu koppeln, zum bestehenden Live-Spieltag hinzufügen oder (nach Rückfrage) ersetzen. */
export function couplingKind(settings: Settings, lead: { view: ViewerLink }): CouplingKind {
  if (!settings.live) return 'new';
  const l = settings.live;
  // Derselbe Live-Spieltag nur bei gleichem Topic und gleichen Schlüsseln; sonst gilt er als anderer.
  const same = l.topic === lead.view.topic && l.orgPub === lead.view.orgPub && l.viewKey === lead.view.viewKey;
  return same ? 'same' : 'replace';
}

/** Ersetzt der Lead-Link den Live-Spieltag, den dieses Gerät organisiert? Dann gehen dessen Schlüssel verloren. */
export const replacesOrganizer = (settings: Settings, lead: { view: ViewerLink }): boolean =>
  couplingKind(settings, lead) === 'replace' && settings.live !== null && isOrganizer(settings.live);

/**
 * FR-L03, FR-L04: übernimmt einen (geprüften) Lead-Link. Fehlt die Mannschaft in "Meine Mannschaften",
 * wird sie mit Name und Trikots angelegt.
 */
export function applyLeadLink(
  settings: Settings,
  lead: LeadLinkData,
  cert: LeadCert,
  deps: { now: number; newId(): string },
): Settings {
  const cred: LiveTeamCred = {
    key: cert.key,
    name: cert.name,
    homeColor: cert.homeColor,
    awayColor: cert.awayColor,
    leadKey: lead.key,
    cert: lead.cert,
    sends: true,
  };
  const current = couplingKind(settings, lead) === 'same' ? settings.live : null;
  let live: LiveSpieltag;
  if (current) {
    // Der eingefügte Link gilt: Schlüssel und Zertifikat werden ersetzt (z. B. nach neuem Zertifikat).
    const keep = current.teams.some((t) => t.key === cred.key)
      ? current.teams.map((t) => (t.key === cred.key ? cred : t))
      : [...current.teams, cred];
    const fromLink = configOf(lead.config);
    const newer = newerConfig(configOf(current.config), fromLink) === fromLink;
    live = { ...current, teams: keep, config: newer && fromLink ? lead.config : current.config };
  } else {
    live = {
      v: 1,
      topic: lead.view.topic,
      viewKey: lead.view.viewKey,
      orgPub: lead.view.orgPub,
      config: lead.config,
      teams: [cred],
      createdAt: deps.now,
    };
  }
  return { ...settings, live, teams: adoptTeams(settings, [cert], deps.newId) };
}

/** FR-L03: fehlende Mannschaften mit Name und Trikots in "Meine Mannschaften" übernehmen. */
export function adoptTeams(settings: Settings, add: Omit<TrainerTeam, 'key'>[], newId: () => string): Team[] {
  const teams = [...settings.teams];
  for (const t of add) {
    if (teams.some((x) => normalizeName(x.name) === normalizeName(t.name))) continue;
    teams.push({
      id: newId(),
      name: t.name,
      homeColor: t.homeColor,
      awayColor: t.awayColor,
      lastSchema: null,
      lastSquad: [],
      lastUsedAt: 0,
    });
  }
  return teams;
}

/** Mannschaften des Trainer-Links, die in der (geprüften) Konfiguration stehen. */
export const trainerTeamsOf = (trainer: TrainerLinkData): TrainerTeam[] => {
  const keys = configOf(trainer.config)?.teams ?? [];
  return trainer.teams.filter((t) => keys.includes(t.key));
};

/**
 * FR-L03, FR-L04: macht das Handy mit einem (geprüften) Trainer-Link zum Trainer-Handy. Es erzeugt einen
 * eigenen Lead-Schlüssel und je Mannschaft ein mit dem Organisator-Schlüssel signiertes Zertifikat, damit
 * Meldungen für Zuschauer gleich aussehen wie bisher.
 */
export async function applyTrainerLink(
  settings: Settings,
  trainer: TrainerLinkData,
  deps: Pick<LiveDeps, 'now' | 'newId' | 'newSigningKey' | 'signData'>,
): Promise<Settings> {
  const teams = trainerTeamsOf(trainer);
  const lead = await deps.newSigningKey();
  const creds: LiveTeamCred[] = [];
  for (const t of teams) {
    const cert: LeadCert = { ...t, pub: lead.pub, iat: deps.now };
    creds.push({ ...t, leadKey: lead.priv, cert: await deps.signData(trainer.orgKey, cert), sends: true });
  }
  const current = couplingKind(settings, trainer) === 'same' ? settings.live : null;
  const fromLink = configOf(trainer.config);
  // Kennt das Handy schon eine jüngere Konfiguration, bleibt sie (z. B. Titel inzwischen geändert).
  const keepConfig = current !== null && newerConfig(configOf(current.config), fromLink) !== fromLink;
  const live: LiveSpieltag = {
    v: 1,
    topic: trainer.view.topic,
    viewKey: trainer.view.viewKey,
    orgPub: trainer.view.orgPub,
    orgKey: trainer.orgKey,
    config: current && keepConfig ? current.config : trainer.config,
    teams: creds,
    // Gleicher Live-Spieltag: alte, beendete Spiele bleiben weiter unveröffentlicht (R-L11).
    createdAt: current ? current.createdAt : deps.now,
  };
  return { ...settings, live, teams: adoptTeams(settings, teams, deps.newId) };
}

/** US5-S3: Der Live-Spieltag wurde auf einem anderen Trainer-Handy neu ausgestellt; dieses Handy sendet nicht mehr. */
export const isRetired = (live: LiveSpieltag): boolean => configOf(live.config)?.retired === true;

/** FR-L04: Mannschaft, für die dieses Gerät Spiele mit dieser eigenen Mannschaft sendet, sonst null. */
export function liveTeamFor(ownTeam: string, live: LiveSpieltag | null): LiveTeamCred | null {
  if (!live || isRetired(live)) return null;
  const name = normalizeName(ownTeam);
  return live.teams.find((t) => sendsFor(live, t) && normalizeName(t.name) === name) ?? null;
}

/**
 * Spec 017 FR-C06 (research.md R-C2): Gehört das Spiel zu den `KEEP_PER_GROUP` zuletzt angelegten Spielen seiner
 * Live-Mannschaft auf diesem Handy? Der Dienst hält je Mannschaft nur so viele; eine Korrektur an einem älteren
 * Spiel brächte es als jüngstes zurück. Nicht live gesendete Spiele ("Nicht live senden", nie gesendet) zählen nicht
 * mit, weil der Dienst sie nicht unter "Letzte Spiele" führt.
 */
export function isRecentGame(games: Game[], game: Game, live: LiveSpieltag | null): boolean {
  const team = liveTeamFor(game.ownTeam, live);
  if (!team) return false;
  const newer = games.filter(
    (g) => g.id !== game.id && g.createdAt > game.createdAt && sendingTeamFor(g, live)?.key === team.key,
  );
  return newer.length < KEEP_PER_GROUP;
}

/** FR-L06, FR-L09: Mannschaft, für die dieses Gerät das Spiel sendet, sonst null. */
export const sendingTeamFor = (game: Game, live: LiveSpieltag | null): LiveTeamCred | null =>
  game.live === false ? null : liveTeamFor(game.ownTeam, live);
