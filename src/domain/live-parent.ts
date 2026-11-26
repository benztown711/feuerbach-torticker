import { configOf, parseLeadCert } from './live-spieltag';
import { isObj, isPrivateKeyParts, isSignedData, isTime } from './live-validate';
import type {
  EventPerson,
  Game,
  LeadCert,
  LiveConfig,
  LiveSpieltag,
  LiveTeamCred,
  Player,
  PrivateKeyParts,
  Scorer,
  SignedData,
} from './types';

/**
 * Spec 024 (research.md R-E1 bis R-E4): Eltern tickern über den Zuschauer-Link. Ein Eltern-Schlüssel je
 * Live-Spieltag mit einem vom Organisator signierten Zertifikat für alle Mannschaften; ob Eltern für eine
 * Mannschaft tickern dürfen, steht in der Konfiguration (`x`).
 */

/** Kurzlabel des Eltern-Zertifikats: gilt für jede Mannschaft. */
export const PARENT_KEY = '*';
export const MIN_TICKER_NAME = 2;
export const MAX_TICKER_NAME = 20;

export interface ParentCert extends LeadCert {
  p: 1;
}

/** Eltern-Paket in der Konfigurations-Meldung (Feld `k`), signiert vom Organisator. */
export interface ParentKit {
  k: PrivateKeyParts;
  c: SignedData;
  iat: number;
}

/** Was ein Eltern-Handy zum Senden speichert (`Settings.liveTicker`). */
export interface LiveTicker {
  topic: string;
  viewKey: string;
  orgPub: string;
  /** Eltern-Paket, wie vom Organisator signiert. */
  kit: SignedData;
  /** Jüngste bekannte Konfiguration (Mannschaften, "Eltern dürfen tickern"). */
  config: SignedData;
}

/** Inhalt des Eltern-Zertifikats; Name und Trikotfarben nur, weil Lead-Zertifikate sie verlangen. */
export const parentCertValue = (pub: string, iat: number): ParentCert => ({
  key: PARENT_KEY,
  name: 'Eltern',
  homeColor: 'rot',
  awayColor: 'weiss',
  pub,
  iat,
  p: 1,
});

/** R-E1: neues Eltern-Paket (Schlüssel, Zertifikat), beides signiert mit dem Organisator-Schlüssel. */
export async function makeKit(
  orgKey: PrivateKeyParts,
  deps: {
    now: number;
    newSigningKey(): Promise<{ pub: string; priv: PrivateKeyParts }>;
    signData(priv: PrivateKeyParts, value: unknown): Promise<SignedData>;
  },
): Promise<SignedData> {
  const key = await deps.newSigningKey();
  const c = await deps.signData(orgKey, parentCertValue(key.pub, deps.now));
  return deps.signData(orgKey, { k: key.priv, c, iat: deps.now });
}

/** Inhalt eines gespeicherten (bereits geprüften) Eltern-Pakets. */
export function kitOf(signed: SignedData | undefined): ParentKit | null {
  if (!signed) return null;
  try {
    return parseParentKit(JSON.parse(signed.d));
  } catch {
    return null;
  }
}

/** Geprüfter Inhalt eines Zertifikats: Eltern-Zertifikat? */
export function isParentCert(v: unknown): v is ParentCert {
  const cert = parseLeadCert(v);
  return cert !== null && cert.key === PARENT_KEY && isObj(v) && v.p === 1;
}

/** Inhalt eines (bereits geprüften) Eltern-Pakets. */
export function parseParentKit(v: unknown): ParentKit | null {
  if (!isObj(v) || !isPrivateKeyParts(v.k) || !isSignedData(v.c) || !isTime(v.iat) || v.iat <= 0) return null;
  return { k: { d: v.k.d, x: v.k.x, y: v.k.y }, c: { d: v.c.d, s: v.c.s }, iat: v.iat };
}

/** FR-E03, FR-E18: Dürfen Eltern für die Mannschaft tickern? Ohne `x` alle Mannschaften. */
export const parentAllowed = (config: LiveConfig | null, team: string): boolean =>
  config !== null && config.teams.includes(team) && !(config.x ?? []).includes(team);

export const allowedTeams = (config: LiveConfig | null): string[] =>
  config ? config.teams.filter((t) => parentAllowed(config, t)) : [];

/**
 * R-E3: Live-Spieltag eines Eltern-Handys für den Sender: ohne Organisator-Schlüssel, je erlaubter Mannschaft ein
 * Zugang mit Eltern-Schlüssel und Eltern-Zertifikat. Ohne Mannschaftsdetails (ältere Konfiguration) keine Zugänge.
 */
export function tickerSpieltag(ticker: LiveTicker, kit: ParentKit): LiveSpieltag {
  const config = ticker.config;
  const c = configOf(config);
  const details = c?.m ?? [];
  const teams: LiveTeamCred[] = allowedTeams(c).flatMap((key) => {
    const d = details.find(([k]) => k === key);
    return d ? [{ key, name: d[1], homeColor: d[2], awayColor: d[3], leadKey: kit.k, cert: kit.c, sends: true }] : [];
  });
  return { v: 1, topic: ticker.topic, viewKey: ticker.viewKey, orgPub: ticker.orgPub, config, teams, createdAt: 0 };
}

/** FR-E09: Ticker-Name, 2 bis 20 Zeichen, Leerzeichen zusammengezogen. */
export function checkTickerName(raw: string): { ok: boolean; name: string; error?: string } {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < MIN_TICKER_NAME) return { ok: false, name, error: 'Bitte mindestens 2 Zeichen.' };
  if (name.length > MAX_TICKER_NAME) return { ok: false, name, error: 'Höchstens 20 Zeichen.' };
  return { ok: true, name };
}

/** Wer ein Spiel tickert (aus dem Live-Stand). */
export interface Ticker {
  name: string | null;
  trainer: boolean;
}

/** Zeile mit hervorgehobenem Teil (`tag`). */
export interface TickerLine {
  before: string;
  tag: string;
  after: string;
}

/**
 * FR-E06: "Paul tickert bereits", "Trainer Jonas tickert bereits", "Du tickerst"; nach dem Schlusspfiff
 * "Getickert von …". Ohne Namen und ohne Trainer-Kennzeichen (ältere Handys) keine Zeile.
 */
export function tickerLine(t: Ticker, at: { own: boolean; ended: boolean }): TickerLine | null {
  let who: string;
  if (at.own) who = at.ended ? 'dir' : 'Du';
  else if (t.trainer) who = t.name ? `Trainer ${t.name}` : 'Trainer';
  else if (t.name) who = t.name;
  else return null;
  if (at.ended) return { before: 'Getickert von ', tag: who, after: '' };
  return { before: '', tag: who, after: at.own ? ' tickerst' : ' tickert bereits' };
}

/** Kennung eines Kindes aus der Kader-Kopie (`viewerPlayers`). */
export const isKaderId = (id: string): boolean => id.startsWith('kader:');

/**
 * R-E5: Auf dem Eltern-Handy werden Kinder aus der Kader-Kopie als Freitext gespeichert, damit nichts in den Kader
 * des Handys gelangt. Vorlagen mit Kopie-Kennung entfallen.
 */
export function kaderAsText(game: Game, players: Player[]): Game {
  const name = (id: string): string | null => players.find((p) => p.id === id)?.name ?? null;
  const person = (p: EventPerson): EventPerson => {
    if (p?.kind !== 'player' || !isKaderId(p.playerId)) return p;
    const n = name(p.playerId);
    return n === null ? null : { kind: 'text', text: n };
  };
  const goals = game.goals.map((g) => {
    const scorer = g.scorer?.kind === 'player' ? (person(g.scorer) as Scorer) : g.scorer;
    const assist = g.assist && isKaderId(g.assist) ? null : g.assist;
    return scorer === g.scorer && assist === g.assist
      ? g
      : { ...g, scorer, ...(g.assist !== undefined ? { assist } : {}) };
  });
  const events = game.events?.map((e) => (e.kind === 'card' ? { ...e, who: person(e.who) } : e));
  const shootout = game.shootout && {
    ...game.shootout,
    shots: game.shootout.shots.map((s) => ({ ...s, who: person(s.who) })),
  };
  return {
    ...game,
    goals,
    ...(events ? { events } : {}),
    ...(shootout ? { shootout } : {}),
  };
}
