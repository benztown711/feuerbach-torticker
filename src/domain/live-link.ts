import { decodedLength, isBase64Url, textFromBase64Url, textToBase64Url } from './base64url';
import type { PrivateKeyParts, SignedData, ViewerLink } from './types';

/** Inhalt eines Lead-Links (contracts/live-link.md). */
export interface LeadLinkData {
  view: ViewerLink;
  cert: SignedData;
  key: PrivateKeyParts;
  /** Jüngste Konfiguration, signiert vom Organisator. */
  config: SignedData;
}

export type ParsedLink =
  { kind: 'view'; view: ViewerLink } | { kind: 'lead'; lead: LeadLinkData } | { kind: 'invalid' };

const INVALID: ParsedLink = { kind: 'invalid' };
const TOPIC = /^[A-Za-z0-9_-]{22}$/;
const MAX_TITLE = 40;
const MAX_SIGNED = 2000;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
/** base64url mit genau `bytes` Byte Inhalt. */
const isKey = (v: unknown, bytes: number): v is string =>
  typeof v === 'string' && isBase64Url(v) && decodedLength(v) === bytes;
const isTitle = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_TITLE;

/** Signierter JSON-Text mit ECDSA-P-256-Signatur (64 Byte). */
export const isSignedData = (v: unknown): v is SignedData =>
  isObj(v) && typeof v.d === 'string' && v.d.length > 0 && v.d.length <= MAX_SIGNED && isKey(v.s, 64);

export const isPrivateKeyParts = (v: unknown): v is PrivateKeyParts =>
  isObj(v) && isKey(v.d, 32) && isKey(v.x, 32) && isKey(v.y, 32);

function viewOf(raw: Obj): ViewerLink | null {
  if (raw.v !== 1 || typeof raw.t !== 'string' || !TOPIC.test(raw.t)) return null;
  if (!isKey(raw.k, 32) || !isKey(raw.o, 65) || !isTitle(raw.n)) return null;
  return { topic: raw.t, viewKey: raw.k, orgPub: raw.o, title: raw.n };
}

const viewFields = (v: ViewerLink) => ({ v: 1, t: v.topic, k: v.viewKey, o: v.orgPub, n: v.title });

export const viewerLinkPath = (view: ViewerLink): string =>
  `/live/${textToBase64Url(JSON.stringify(viewFields(view)))}`;

export const leadLinkPath = (lead: LeadLinkData): string =>
  `/lead/${textToBase64Url(JSON.stringify({ ...viewFields(lead.view), c: lead.cert, p: lead.key, g: lead.config }))}`;

/** Vollständiger Link: Basisadresse der App plus Fragment. */
export const linkUrl = (base: string, path: string): string => `${base}#${path}`;

function decode(data: string): Obj | null {
  try {
    const raw: unknown = JSON.parse(textFromBase64Url(data));
    return isObj(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Pfad aus dem Fragment, z. B. "/live/<Daten>"; prüft alle Pflichtfelder. */
export function parseLinkPath(path: string): ParsedLink {
  const m = /^\/(live|lead)\/([A-Za-z0-9_-]+)$/.exec(path);
  if (!m) return INVALID;
  const raw = decode(m[2] as string);
  const view = raw && viewOf(raw);
  if (!raw || !view) return INVALID;
  if (m[1] === 'live') return { kind: 'view', view };
  if (!isSignedData(raw.c) || !isPrivateKeyParts(raw.p) || !isSignedData(raw.g)) return INVALID;
  return {
    kind: 'lead',
    lead: {
      view,
      cert: { d: raw.c.d, s: raw.c.s },
      key: { d: raw.p.d, x: raw.p.x, y: raw.p.y },
      config: { d: raw.g.d, s: raw.g.s },
    },
  };
}

/** Sucht einen Zuschauer- oder Lead-Link in eingefügtem Text (WhatsApp hängt oft Text an). */
export function findLink(text: string): ParsedLink {
  const m = /#(\/(?:live|lead)\/[A-Za-z0-9_-]+)/.exec(text);
  return m ? parseLinkPath(m[1] as string) : INVALID;
}
