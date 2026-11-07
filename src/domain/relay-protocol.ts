import { isBase64Url } from './base64url';
import { isKey, isObj, isSignedData, isTopic, type Obj } from './live-validate';
import type { SignedData } from './types';

/**
 * Spec 007 contracts/relay-api.md, research.md R-N3 bis R-N6: Prüflogik des eigenen Vermittlungsdienstes.
 * Von der App (senden, empfangen) und vom Worker (annehmen, auswählen) gemeinsam genutzt; ohne Browser- oder
 * Worker-APIs.
 */

export const RELAY_PREFIX = 'torticker-relay-v1';
/** Höchstlänge einer gespeicherten Meldung (`t1.…`). */
export const MAX_BODY = 4000;
/** Höchstens so viele Mannschaften (`group`) je Live-Spieltag (Spec 006 FR-L01). */
export const MAX_GROUPS = 6;
/** Höchstens so viele Zeilen je Live-Spieltag. */
export const MAX_ROWS = 200;
/** FR-N02: je Mannschaft die letzten 10 Spiele. */
export const KEEP_PER_GROUP = 10;
/** R-N5: die jüngsten Plan-Meldungen. */
export const KEEP_PLANS = 50;
const DAY_MS = 24 * 60 * 60_000;
/** R-N5: Grabsteine ("Nicht live senden", gelöscht) bleiben so lange. */
export const TOMBSTONE_MS = 30 * DAY_MS;
/** FR-N12: ohne Meldung löscht der Dienst einen Live-Spieltag nach einem Jahr. */
export const RETENTION_MS = 365 * DAY_MS;

interface Base {
  body: string;
  sig: string;
}
export interface GameWrite extends Base {
  kind: 'game';
  slot: string;
  group: string;
  h: number;
  at: number;
  gone: boolean;
  cert: SignedData;
}
export interface CfgWrite extends Base {
  kind: 'cfg';
  iat: number;
}
export interface PlanWrite extends Base {
  kind: 'plan';
}
export interface RetireWrite extends Base {
  kind: 'retire';
}
export type RelayWrite = GameWrite | CfgWrite | PlanWrite | RetireWrite;
/** Schreibanfrage vor dem Signieren (ohne `sig` und `cert`), je Art. */
export type RelayDraft = RelayWrite extends infer W ? (W extends RelayWrite ? Omit<W, 'sig' | 'cert'> : never) : never;

/** 22 Zeichen base64url (128 Bit): `slot` und `group`. */
const isId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{22}$/.test(v);
const isBody = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= MAX_BODY && v.startsWith('t1.') && v.length > 3 && isBase64Url(v.slice(3));
const isMs = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;
const isHandover = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100;

/** R-N4: Name des Durable Objects; nur mit gültigem Topic und öffentlichem Schlüssel (65 Byte). */
export function objectName(topic: unknown, orgPub: unknown): string | null {
  return isTopic(topic) && isKey(orgPub, 65) && /^[A-Za-z0-9_-]+$/.test(orgPub) ? `${topic}.${orgPub}` : null;
}

const FIELDS: Record<RelayWrite['kind'], string[]> = {
  game: ['kind', 'slot', 'group', 'h', 'at', 'gone', 'body', 'sig', 'cert'],
  cfg: ['kind', 'iat', 'body', 'sig'],
  plan: ['kind', 'body', 'sig'],
  retire: ['kind', 'body', 'sig'],
};

const onlyFields = (v: Obj, kind: RelayWrite['kind']): boolean => Object.keys(v).every((k) => FIELDS[kind].includes(k));

/** Prüft eine Schreibanfrage streng (contracts/relay-api.md); unbekannte Felder machen sie ungültig. */
export function parseWrite(v: unknown): RelayWrite | null {
  if (!isObj(v) || typeof v.kind !== 'string' || !Object.hasOwn(FIELDS, v.kind)) return null;
  const kind = v.kind as RelayWrite['kind'];
  if (!onlyFields(v, kind) || !isBody(v.body) || !isKey(v.sig, 64)) return null;
  const base = { body: v.body, sig: v.sig };
  if (kind === 'game') {
    const ok =
      isId(v.slot) &&
      isId(v.group) &&
      isHandover(v.h) &&
      isMs(v.at) &&
      typeof v.gone === 'boolean' &&
      isSignedData(v.cert);
    return ok
      ? {
          kind,
          slot: v.slot as string,
          group: v.group as string,
          h: v.h as number,
          at: v.at as number,
          gone: v.gone as boolean,
          ...base,
          cert: v.cert as SignedData,
        }
      : null;
  }
  if (kind === 'cfg') return isMs(v.iat) ? { kind, iat: v.iat, ...base } : null;
  return { kind, ...base };
}

/** R-N4: Text, den der Schreibnachweis signiert; fehlende Felder als leere Zeichenkette. */
export function signedText(name: string, w: RelayWrite, bodyHash: string): string {
  const g = w.kind === 'game' ? w : null;
  const parts = [
    RELAY_PREFIX,
    name,
    w.kind,
    g?.slot ?? '',
    g?.group ?? '',
    g ? String(g.h) : '',
    g ? String(g.at) : '',
    w.kind === 'cfg' ? String(w.iat) : '',
    g ? (g.gone ? '1' : '0') : '',
    bodyHash,
  ];
  return parts.join('|');
}

/** R-N5 (wie Spec 006 FR-L23): größerer Übergabezähler, bei gleichem ein späteres oder gleiches `at`. */
export function acceptsGame(stored: { h: number; at: number } | null, w: { h: number; at: number }): boolean {
  return stored === null || w.h > stored.h || (w.h === stored.h && w.at >= stored.at);
}

/** R-N5: Konfiguration mit `iat` größer oder gleich der gespeicherten. */
export const acceptsCfg = (storedIat: number | null, iat: number): boolean => storedIat === null || iat >= storedIat;

export interface GameRow {
  slot: string;
  grp: string;
  gone: boolean;
  /** Serverzeit (ms), zu der der `slot` zum ersten Mal kam. */
  first: number;
  /** Serverzeit (ms) des letzten Schreibens. */
  time: number;
}

/** R-N5: `slot`s, die wegfallen: je Mannschaft über die 10 jüngsten hinaus, Grabsteine nach 30 Tagen. */
export function gameRowsToDrop(rows: GameRow[], now: number): string[] {
  const drop = rows.filter((r) => r.gone && now - r.time > TOMBSTONE_MS).map((r) => r.slot);
  const byGroup = new Map<string, GameRow[]>();
  for (const r of rows.filter((x) => !x.gone)) byGroup.set(r.grp, [...(byGroup.get(r.grp) ?? []), r]);
  for (const list of byGroup.values())
    drop.push(
      ...list
        .sort((a, b) => b.first - a.first)
        .slice(KEEP_PER_GROUP)
        .map((r) => r.slot),
    );
  return drop;
}

/** R-N5: Plan-Meldungen über die 50 jüngsten hinaus. */
export const plansToDrop = (seqs: number[]): number[] => [...seqs].sort((a, b) => b - a).slice(KEEP_PLANS);

/**
 * R-N5: Platz für einen Schreibvorgang? `groups` sind die vorhandenen Mannschaften, `rows` die Zeilen,
 * `replaces` ob eine vorhandene Zeile ersetzt wird.
 */
export function hasRoom(groups: string[], rows: number, w: RelayWrite, replaces: boolean): boolean {
  if (replaces) return true;
  if (rows >= MAX_ROWS) return false;
  return w.kind !== 'game' || groups.includes(w.group) || groups.length < MAX_GROUPS;
}

export interface FrameMsg {
  seq: number;
  /** Serverzeit in Sekunden. */
  time: number;
  body: string;
}
export type ServerFrame = { t: 'hello'; time: number; msgs: FrameMsg[] } | ({ t: 'msg' } & FrameMsg);

const asMsg = (v: unknown): FrameMsg | null =>
  isObj(v) && isMs(v.seq) && typeof v.time === 'number' && Number.isFinite(v.time) && isBody(v.body)
    ? { seq: v.seq, time: v.time, body: v.body }
    : null;

/** R-N6: Nachricht des Dienstes prüfen; ungültige Meldungen in `hello` fallen weg. */
export function parseServerFrame(text: string): ServerFrame | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(v)) return null;
  if (v.t === 'hello') {
    if (typeof v.time !== 'number' || !Number.isFinite(v.time) || !Array.isArray(v.msgs)) return null;
    const msgs = v.msgs.map(asMsg).filter((m): m is FrameMsg => m !== null);
    return { t: 'hello', time: v.time, msgs };
  }
  const m = v.t === 'msg' ? asMsg(v) : null;
  return m ? { t: 'msg', ...m } : null;
}
