import { textFromBase64Url, textToBase64Url } from './base64url';
import { joinList } from './format';
import { isPaletteColor } from './jersey-colors';
import {
  isKey,
  isObj,
  isPrivateKeyParts,
  isSignedData,
  isText,
  MAX_KEY,
  MAX_LIVE_TEAMS,
  MAX_TITLE,
  type Obj,
} from './live-validate';
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

/** Mannschaft im Trainer-Link: Kurzlabel, Name und Trikots (zum Übernehmen in "Meine Mannschaften"). */
export interface TrainerTeam {
  key: string;
  name: string;
  homeColor: string;
  awayColor: string;
}

/** Inhalt eines Trainer-Links (contracts/live-link.md): senden für alle Mannschaften und verwalten. */
export interface TrainerLinkData {
  view: ViewerLink;
  /** Privater Organisator-Schlüssel. */
  orgKey: PrivateKeyParts;
  /** Jüngste Konfiguration, signiert vom Organisator. */
  config: SignedData;
  teams: TrainerTeam[];
}

export type ParsedLink =
  | { kind: 'view'; view: ViewerLink }
  | { kind: 'lead'; lead: LeadLinkData }
  | { kind: 'trainer'; trainer: TrainerLinkData }
  | { kind: 'invalid' };

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

export const trainerLinkPath = (t: TrainerLinkData): string =>
  `/trainer/${textToBase64Url(
    JSON.stringify({
      ...viewFields(t.view),
      q: t.orgKey,
      g: t.config,
      m: t.teams.map((x) => [x.key, x.name, x.homeColor, x.awayColor]),
    }),
  )}`;

/** Vollständiger Link: Basisadresse der App plus Fragment. */
export const linkUrl = (base: string, path: string): string => `${base}#${path}`;

/** Spec 009 FR-H17: Text für "Teilen" in der Eltern-Leiste, z. B. für Großeltern. */
export function viewerShareText(title: string, teams: string[], url: string): string {
  const who = teams.length > 0 ? ` (Sportvg Feuerbach ${joinList(teams)})` : '';
  return `${title} live${who}. Der Link gilt die ganze Saison: ${url}`;
}

function decode(data: string): Obj | null {
  try {
    const raw: unknown = JSON.parse(textFromBase64Url(data));
    return isObj(raw) ? raw : null;
  } catch {
    return null;
  }
}

function trainerTeam(v: unknown): TrainerTeam | null {
  if (!Array.isArray(v) || !isText(v[0], MAX_KEY) || !isText(v[1], MAX_TITLE)) return null;
  const [key, name, homeColor, awayColor] = v as unknown[];
  if (typeof homeColor !== 'string' || typeof awayColor !== 'string') return null;
  if (!isPaletteColor(homeColor) || !isPaletteColor(awayColor)) return null;
  return { key: key as string, name: name as string, homeColor, awayColor };
}

function trainerOf(raw: Obj, view: ViewerLink): ParsedLink {
  if (!isPrivateKeyParts(raw.q) || !isSignedData(raw.g) || !Array.isArray(raw.m)) return INVALID;
  const list = raw.m as unknown[];
  const teams = list.map(trainerTeam);
  if (list.length === 0 || list.length > MAX_LIVE_TEAMS || teams.some((t) => t === null)) return INVALID;
  // Jedes Kurzlabel höchstens einmal (eindeutige Zuordnung Spiel → Mannschaft).
  if (new Set(teams.map((t) => t?.key)).size !== teams.length) return INVALID;
  return {
    kind: 'trainer',
    trainer: {
      view,
      orgKey: { d: raw.q.d, x: raw.q.x, y: raw.q.y },
      config: { d: raw.g.d, s: raw.g.s },
      teams: teams as TrainerTeam[],
    },
  };
}

/** Pfad aus dem Fragment, z. B. "/live/<Daten>"; prüft alle Pflichtfelder. */
export function parseLinkPath(path: string): ParsedLink {
  const m = /^\/(live|lead|trainer)\/([A-Za-z0-9_-]+)$/.exec(path);
  if (!m) return INVALID;
  const raw = decode(m[2] as string);
  const view = raw && viewOf(raw);
  if (!raw || !view) return INVALID;
  if (m[1] === 'live') return { kind: 'view', view };
  if (m[1] === 'trainer') return trainerOf(raw, view);
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

/** Sucht einen Zuschauer-, Trainer- oder Lead-Link in eingefügtem Text (WhatsApp hängt oft Text an). */
export function findLink(text: string): ParsedLink {
  const m = /#(\/(?:live|lead|trainer)\/[A-Za-z0-9_-]+)/.exec(text);
  return m ? parseLinkPath(m[1] as string) : INVALID;
}
