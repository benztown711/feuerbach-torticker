import { decodedLength, isBase64Url } from './base64url';
import { teamShortLabel } from './history';
import { isPaletteColor } from './jersey-colors';
import type { LeadLinkData } from './live-link';
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
  ViewerLink,
} from './types';

/** Spec 006: Live-Spieltag anlegen, koppeln und Spiele zuordnen (FR-L01 bis FR-L04, FR-L06, FR-L09). */

export const MAX_LIVE_TEAMS = 6;
export const MAX_TITLE = 40;
export const DEFAULT_LIVE_TITLE = 'Unser Spieltag';
const MAX_KEY = 20;

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
  selfTeamId: string | null;
}

export interface LiveInputCheck {
  ok: boolean;
  title: string;
  errors: Partial<Record<'title' | 'teams', string>>;
}

export function validateLiveInput(input: LiveInput, teams: Team[]): LiveInputCheck {
  const title = input.title.trim().replace(/\s+/g, ' ');
  const errors: LiveInputCheck['errors'] = {};
  if (title.length === 0) errors.title = 'Bitte einen Titel eintragen.';
  else if (title.length > MAX_TITLE) errors.title = 'Höchstens 40 Zeichen.';
  const known = input.teamIds.filter((id) => teams.some((t) => t.id === id));
  if (known.length === 0) errors.teams = 'Bitte mindestens eine Mannschaft wählen.';
  else if (known.length > MAX_LIVE_TEAMS) errors.teams = 'Höchstens 6 Mannschaften.';
  if (known.length !== input.teamIds.length) errors.teams ??= 'Unbekannte Mannschaft.';
  return { ok: Object.keys(errors).length === 0, title, errors };
}

/** FR-L01, FR-L02: legt Schlüssel, Konfiguration und je Mannschaft ein Lead-Zertifikat an. */
export async function createSpieltag(input: LiveInput, teams: Team[], deps: LiveDeps): Promise<LiveSpieltag> {
  const check = validateLiveInput(input, teams);
  if (!check.ok) throw new Error(Object.values(check.errors).join(' '));
  const org = await deps.newSigningKey();
  const chosen = liveTeamOptions(teams).filter((o) => input.teamIds.includes(o.team.id));
  const config: LiveConfig = { title: check.title, teams: chosen.map((o) => o.key), iat: deps.now };
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
      sends: team.id === input.selfTeamId,
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

const configOf = (signed: SignedData): LiveConfig | null => {
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

export function leadLinkFor(live: LiveSpieltag, key: string): LeadLinkData | null {
  const cred = live.teams.find((t) => t.key === key);
  return cred ? { view: viewerOf(live), cert: cred.cert, key: cred.leadKey, config: live.config } : null;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Prüft den Inhalt eines Lead-Zertifikats (Signatur prüft die Plattform). */
export function parseLeadCert(v: unknown): LeadCert | null {
  if (!isObj(v) || !isText(v.key, MAX_KEY) || !isText(v.name, MAX_TITLE)) return null;
  if (typeof v.homeColor !== 'string' || !isPaletteColor(v.homeColor)) return null;
  if (typeof v.awayColor !== 'string' || !isPaletteColor(v.awayColor)) return null;
  if (typeof v.pub !== 'string' || !isBase64Url(v.pub) || decodedLength(v.pub) !== 65 || !isTime(v.iat)) return null;
  return { key: v.key, name: v.name, homeColor: v.homeColor, awayColor: v.awayColor, pub: v.pub, iat: v.iat };
}

/** Prüft den Inhalt einer Konfiguration (FR-L19). */
export function parseConfig(v: unknown): LiveConfig | null {
  if (!isObj(v) || !isText(v.title, MAX_TITLE) || !Array.isArray(v.teams) || !isTime(v.iat)) return null;
  const teams = v.teams as unknown[];
  if (teams.length === 0 || teams.length > MAX_LIVE_TEAMS || !teams.every((t) => isText(t, MAX_KEY))) return null;
  return { title: v.title, teams: teams as string[], iat: v.iat };
}

/** Die jüngere von zwei Konfigurationen (größeres `iat`). */
export function newerConfig(a: LiveConfig | null, b: LiveConfig | null): LiveConfig | null {
  if (!a || !b) return a ?? b;
  return b.iat > a.iat ? b : a;
}

export type CouplingKind = 'new' | 'same' | 'replace';

/** Neu koppeln, zum bestehenden Live-Spieltag hinzufügen oder (nach Rückfrage) ersetzen. */
export function couplingKind(settings: Settings, lead: LeadLinkData): CouplingKind {
  if (!settings.live) return 'new';
  return settings.live.topic === lead.view.topic ? 'same' : 'replace';
}

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
    const keep = current.teams.some((t) => t.key === cred.key)
      ? current.teams.map((t) => (t.key === cred.key ? { ...cred, leadKey: t.leadKey, cert: t.cert } : t))
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
  const known = settings.teams.some((t) => normalizeName(t.name) === normalizeName(cert.name));
  const teams: Team[] = known
    ? settings.teams
    : [
        ...settings.teams,
        {
          id: deps.newId(),
          name: cert.name,
          homeColor: cert.homeColor,
          awayColor: cert.awayColor,
          lastSchema: null,
          lastSquad: [],
          lastUsedAt: 0,
        },
      ];
  return { ...settings, live, teams };
}

/** FR-L06, FR-L09: Mannschaft, für die dieses Gerät das Spiel sendet, sonst null. */
export function sendingTeamFor(game: Game, live: LiveSpieltag | null): LiveTeamCred | null {
  if (!live || game.live === false) return null;
  const name = normalizeName(game.ownTeam);
  return live.teams.find((t) => t.sends && normalizeName(t.name) === name) ?? null;
}
