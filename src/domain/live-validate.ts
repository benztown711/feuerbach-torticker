import { decodedLength, isBase64Url } from './base64url';
import type { PrivateKeyParts, SignedData } from './types';

/** Spec 006 research.md R-L9: gemeinsame Prüfungen für Links, Zertifikate und Meldungen. */

export const MAX_TITLE = 40;
/** Kurzlabel einer Mannschaft, z. B. "E1" oder "E1 (2)". */
export const MAX_KEY = 20;
/** Höchstens so viele Mannschaften je Live-Spieltag (FR-L01). */
export const MAX_LIVE_TEAMS = 6;
const MAX_SIGNED = 2000;

export type Obj = Record<string, unknown>;

export const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Nicht leerer Text mit höchstens `max` Zeichen. */
export const isText = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;

export const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Topic bei ntfy.sh: 22 Zeichen base64url (128 Bit Zufall). */
export const isTopic = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{22}$/.test(v);

/** base64url mit genau `bytes` Byte Inhalt (Schlüssel, Signaturen). */
export const isKey = (v: unknown, bytes: number): v is string =>
  typeof v === 'string' && isBase64Url(v) && decodedLength(v) === bytes;

/** Signierter JSON-Text mit ECDSA-P-256-Signatur (64 Byte). */
export const isSignedData = (v: unknown): v is SignedData =>
  isObj(v) && typeof v.d === 'string' && v.d.length > 0 && v.d.length <= MAX_SIGNED && isKey(v.s, 64);

export const isPrivateKeyParts = (v: unknown): v is PrivateKeyParts =>
  isObj(v) && isKey(v.d, 32) && isKey(v.x, 32) && isKey(v.y, 32);
