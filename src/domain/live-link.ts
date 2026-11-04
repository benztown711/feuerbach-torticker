import { textFromBase64Url, textToBase64Url } from './base64url';
import { isKey, isObj, isPrivateKeyParts, isSignedData, isText, MAX_TITLE, type Obj } from './live-validate';
import type { PrivateKeyParts, SignedData, ViewerLink } from './types';

export { isPrivateKeyParts, isSignedData };

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

function viewOf(raw: Obj): ViewerLink | null {
  if (raw.v !== 1 || typeof raw.t !== 'string' || !TOPIC.test(raw.t)) return null;
  if (!isKey(raw.k, 32) || !isKey(raw.o, 65) || !isText(raw.n, MAX_TITLE)) return null;
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
