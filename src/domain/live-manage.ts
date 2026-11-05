import { teamShortLabel } from './history';
import type { TrainerTeam } from './live-link';
import { adoptTeams, checkTitle, configOf, titleOf, type LiveDeps, type LiveTeamOption } from './live-spieltag';
import { MAX_LIVE_TEAMS } from './live-validate';
import { normalizeName } from './validation';
import type {
  LeadCert,
  LiveConfig,
  LiveSpieltag,
  LiveTeamCred,
  PrivateKeyParts,
  Settings,
  SignedData,
  Team,
  TeamDetail,
} from './types';

/**
 * Spec 006 US5: Live-Spieltag verwalten (FR-L19). Jedes Trainer-Handy (mit Organisator-Schlüssel) darf Titel
 * und Mannschaften ändern und alle Links neu ausstellen; bei Änderungen von mehreren Handys gilt die jüngste.
 */

export { checkTitle };

type SignDeps = Pick<LiveDeps, 'now' | 'newSigningKey' | 'signData'>;

const detailsOf = (teams: LiveTeamCred[]): TeamDetail[] => teams.map((t) => [t.key, t.name, t.homeColor, t.awayColor]);

function orgKeyOf(live: LiveSpieltag): PrivateKeyParts {
  if (!live.orgKey) throw new Error('Nur ein Trainer-Handy kann den Live-Spieltag verwalten.');
  return live.orgKey;
}

/** Zeitstempel nach der bekannten Konfiguration, auch wenn die Uhr dieses Handys nachgeht. */
const nextIat = (live: LiveSpieltag, now: number): number => Math.max(now, (configOf(live.config)?.iat ?? 0) + 1);

/** Neues Zertifikat für eine Mannschaft mit eigenem Lead-Schlüssel, signiert mit dem Organisator-Schlüssel. */
async function newCred(t: TrainerTeam, org: PrivateKeyParts, deps: SignDeps): Promise<LiveTeamCred> {
  const lead = await deps.newSigningKey();
  const cert: LeadCert = { ...t, pub: lead.pub, iat: deps.now };
  return { ...t, leadKey: lead.priv, cert: await deps.signData(org, cert), sends: true };
}

/** Signiert die Konfiguration aus Titel und Mannschaften neu. */
async function withConfig(
  live: LiveSpieltag,
  title: string,
  teams: LiveTeamCred[],
  deps: SignDeps,
): Promise<LiveSpieltag> {
  const config: LiveConfig = {
    title,
    teams: teams.map((t) => t.key),
    iat: nextIat(live, deps.now),
    m: detailsOf(teams),
  };
  return { ...live, config: await deps.signData(orgKeyOf(live), config), teams };
}

/** US5-S4: neuer Titel; Links bleiben gleich. */
export async function renameSpieltag(live: LiveSpieltag, raw: string, deps: SignDeps): Promise<LiveSpieltag> {
  const check = checkTitle(raw);
  if (!check.ok) throw new Error(check.error);
  return withConfig(live, check.title, live.teams, deps);
}

/** Mannschaften aus "Meine Mannschaften", die noch fehlen, mit einem freien Kurzlabel. */
export function addableTeams(live: LiveSpieltag, teams: Team[]): LiveTeamOption[] {
  if (live.teams.length >= MAX_LIVE_TEAMS) return [];
  const taken = new Set(live.teams.map((t) => t.key));
  const inLive = (team: Team): boolean => live.teams.some((c) => normalizeName(c.name) === normalizeName(team.name));
  return teams
    .filter((team) => !inLive(team))
    .map((team) => {
      const base = teamShortLabel(team.name);
      let key = base;
      for (let n = 2; taken.has(key); n++) key = `${base} (${n})`;
      taken.add(key);
      return { key, team };
    });
}

/** US5-S1: Mannschaft hinzufügen; Zuschauer- und Trainer-Link bleiben gleich. */
export async function addLiveTeam(live: LiveSpieltag, option: LiveTeamOption, deps: SignDeps): Promise<LiveSpieltag> {
  const org = orgKeyOf(live);
  if (live.teams.length >= MAX_LIVE_TEAMS) throw new Error(`Höchstens ${MAX_LIVE_TEAMS} Mannschaften.`);
  if (live.teams.some((t) => t.key === option.key)) throw new Error(`${option.key} ist schon dabei.`);
  const { team } = option;
  const cred = await newCred(
    { key: option.key, name: team.name, homeColor: team.homeColor, awayColor: team.awayColor },
    org,
    deps,
  );
  return withConfig(live, titleOf(live), [...live.teams, cred], deps);
}

/** Mannschaft entfernen: Das Dashboard zeigt sie nicht mehr, kein Handy sendet mehr für sie. */
export async function removeLiveTeam(live: LiveSpieltag, key: string, deps: SignDeps): Promise<LiveSpieltag> {
  if (!live.teams.some((t) => t.key === key)) throw new Error(`${key} ist nicht dabei.`);
  if (live.teams.length === 1) throw new Error('Mindestens eine Mannschaft bleibt.');
  return withConfig(
    live,
    titleOf(live),
    live.teams.filter((t) => t.key !== key),
    deps,
  );
}

/**
 * US5-S3: alle Links neu ausstellen. Neues Topic, neuer Zuschauer- und Organisator-Schlüssel und neue
 * Zertifikate; Meldungen über die alten Links erreichen das neue Dashboard nicht mehr.
 */
export async function reissueSpieltag(live: LiveSpieltag, deps: LiveDeps): Promise<LiveSpieltag> {
  orgKeyOf(live);
  const org = await deps.newSigningKey();
  const teams: LiveTeamCred[] = [];
  for (const t of live.teams) teams.push(await newCred(t, org.priv, deps));
  const config: LiveConfig = {
    title: titleOf(live),
    teams: teams.map((t) => t.key),
    iat: deps.now,
    m: detailsOf(teams),
  };
  return {
    v: 1,
    topic: deps.newTopic(),
    viewKey: deps.newViewKey(),
    orgPub: org.pub,
    orgKey: org.priv,
    config: await deps.signData(org.priv, config),
    teams,
    // Spiele, die vor der Kopplung schon beendet waren, bleiben unveröffentlicht (R-L11).
    createdAt: live.createdAt,
  };
}

/**
 * US5-S3 (Variante C): Hinweis "neu ausgestellt" für das alte Topic, signiert mit dem alten
 * Organisator-Schlüssel; er enthält keine neuen Links.
 */
export async function retireConfig(live: LiveSpieltag, deps: SignDeps): Promise<SignedData> {
  const config: LiveConfig = {
    title: titleOf(live),
    teams: live.teams.map((t) => t.key),
    iat: nextIat(live, deps.now),
    m: detailsOf(live.teams),
    retired: true,
  };
  return deps.signData(orgKeyOf(live), config);
}

/**
 * US5-S1: übernimmt eine jüngere, bereits geprüfte Konfiguration eines anderen Trainer-Handys. Neue Mannschaften
 * bekommen ein eigenes Zertifikat und landen in "Meine Mannschaften", entfernte fallen weg. Ein Lead-Handy der
 * ersten Version (ohne Organisator-Schlüssel) übernimmt nur Titel und Entfernen. null: nichts zu tun.
 */
export async function adoptConfig(
  settings: Settings,
  signed: SignedData,
  deps: SignDeps & Pick<LiveDeps, 'newId'>,
): Promise<Settings | null> {
  const live = settings.live;
  const next = configOf(signed);
  const current = live ? configOf(live.config) : null;
  if (!live || !next || current?.retired) return null;
  // "neu ausgestellt" gilt auch, wenn die Uhr dieses Handys vorging (größeres iat); sonst die jüngere.
  if (!next.retired && current && next.iat <= current.iat) return null;
  const teams = live.teams.filter((t) => next.teams.includes(t.key));
  const added: TrainerTeam[] = [];
  for (const [key, name, homeColor, awayColor] of next.m ?? []) {
    if (!live.orgKey || !next.teams.includes(key) || teams.some((t) => t.key === key)) continue;
    const t = { key, name, homeColor, awayColor };
    teams.push(await newCred(t, live.orgKey, deps));
    added.push(t);
  }
  teams.sort((a, b) => next.teams.indexOf(a.key) - next.teams.indexOf(b.key));
  return { ...settings, live: { ...live, config: signed, teams }, teams: adoptTeams(settings, added, deps.newId) };
}

/**
 * FR-L21: Live-Spieltag aus einer Sicherung, nur wenn das Handy noch keinen hat (sonst bleibt der eigene). Die
 * Anlegezeit ist mindestens der Zeitpunkt des Wiederherstellens: früher beendete Spiele bleiben unveröffentlicht
 * (R-L11), auch wenn die Datei etwas anderes behauptet.
 */
export function restoreLive(
  settings: Settings,
  live: LiveSpieltag,
  newId: () => string,
  now: number,
): { settings: Settings; restored: boolean } {
  if (settings.live) return { settings, restored: false };
  const restored = { ...live, createdAt: Math.max(live.createdAt, now) };
  return { settings: { ...settings, live: restored, teams: adoptTeams(settings, live.teams, newId) }, restored: true };
}
