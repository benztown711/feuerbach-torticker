import { fromBase64Url, toBase64Url } from './base64url';
import { isPaletteColor } from './jersey-colors';
import { isText, isTopic, MAX_KEY, MAX_LIVE_TEAMS, MAX_TITLE } from './live-validate';
import type { LiveConfig, PrivateKeyParts, TeamDetail, ViewerLink } from './types';

/**
 * Spec 006 FR-L02 (Nachtrag 06.11.2026, research.md R-L20): kurzer Trainer-Link. WhatsApp auf dem iPhone macht
 * den bisherigen Trainer-Link (rund 1.450 Zeichen) nur bis `#/trainer/` antippbar. Darum Bytes statt JSON:
 * Schlüssel roh, Organisator-Schlüssel nur `d` (x, y stecken im öffentlichen Schlüssel) und die Konfiguration
 * ohne Signatur. Wer den privaten Organisator-Schlüssel hat, darf ohnehin jede Konfiguration signieren; das
 * Trainer-Handy signiert sie beim Prüfen selbst (platform/live-setup.ts). Rund 400 statt 1.450 Zeichen.
 */

export const SHORT_FORMAT = 2;

/** Inhalt eines kurzen Trainer-Links; die Konfiguration ist noch nicht signiert. */
export interface ShortTrainerData {
  view: ViewerLink;
  orgKey: PrivateKeyParts;
  config: LiveConfig;
  /** Mannschaften des Links: Kurzlabel, Name, Heim- und Auswärtstrikot. */
  teams: TeamDetail[];
}

const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });

const FLAG_M = 1;
const FLAG_M_SAME = 2;
const FLAG_RETIRED = 4;

const sameTeams = (a: TeamDetail[], b: TeamDetail[]): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Kodiert einen kurzen Trainer-Link (nur die Daten nach `#/trainer/`). */
export function encodeShortTrainer(t: ShortTrainerData): string {
  const out: number[] = [SHORT_FORMAT];
  const bytes = (b: Uint8Array): void => {
    for (const x of b) out.push(x);
  };
  const str = (s: string): void => {
    // Titel und Namen haben höchstens 40 Zeichen, also höchstens 160 Byte.
    const b = enc.encode(s);
    out.push(b.length);
    bytes(b);
  };
  const teams = (list: TeamDetail[]): void => {
    out.push(list.length);
    for (const team of list) team.forEach(str);
  };
  bytes(enc.encode(t.view.topic));
  bytes(fromBase64Url(t.view.viewKey));
  bytes(fromBase64Url(t.view.orgPub).subarray(1));
  bytes(fromBase64Url(t.orgKey.d));
  // iat als 48-Bit-Zahl (Millisekunden reichen bis ins Jahr 10889).
  let iat = Math.max(0, Math.floor(t.config.iat));
  const time: number[] = [];
  for (let i = 0; i < 6; i++) {
    time.unshift(iat % 256);
    iat = Math.floor(iat / 256);
  }
  out.push(...time);
  const m = t.config.m;
  const same = m !== undefined && sameTeams(m, t.teams);
  out.push((m ? FLAG_M : 0) | (same ? FLAG_M_SAME : 0) | (t.config.retired ? FLAG_RETIRED : 0));
  str(t.config.title);
  out.push(t.config.teams.length);
  t.config.teams.forEach(str);
  teams(t.teams);
  if (m && !same) teams(m);
  return toBase64Url(new Uint8Array(out));
}

class Reader {
  private i = 0;
  constructor(private readonly b: Uint8Array) {}
  take(n: number): Uint8Array {
    if (this.i + n > this.b.length) throw new Error('zu kurz');
    const part = this.b.subarray(this.i, this.i + n);
    this.i += n;
    return part;
  }
  byte(): number {
    return this.take(1)[0] as number;
  }
  str(max: number): string {
    const s = dec.decode(this.take(this.byte()));
    // Wie beim langen Link (isText): nicht leer, nicht nur Leerzeichen, höchstens `max` Zeichen.
    if (!isText(s, max)) throw new Error('Text');
    return s;
  }
  team(): TeamDetail {
    const team: TeamDetail = [this.str(MAX_KEY), this.str(MAX_TITLE), this.str(MAX_KEY), this.str(MAX_KEY)];
    if (!isPaletteColor(team[2]) || !isPaletteColor(team[3])) throw new Error('Farbe');
    return team;
  }
  /** `empty`: Mannschaftsdetails `m` einer Konfiguration dürfen leer sein (parseConfig). */
  teams(empty = false): TeamDetail[] {
    const n = this.byte();
    if ((n === 0 && !empty) || n > MAX_LIVE_TEAMS) throw new Error('Mannschaften');
    return Array.from({ length: n }, () => this.team());
  }
  get done(): boolean {
    return this.i === this.b.length;
  }
}

/** Dekodiert einen kurzen Trainer-Link; null bei jedem Formfehler. */
export function decodeShortTrainer(bytes: Uint8Array): ShortTrainerData | null {
  try {
    const r = new Reader(bytes);
    if (r.byte() !== SHORT_FORMAT) return null;
    const topic = dec.decode(r.take(22));
    if (!isTopic(topic)) return null;
    const viewKey = toBase64Url(r.take(32));
    const xy = r.take(64);
    const d = toBase64Url(r.take(32));
    let iat = 0;
    for (const x of r.take(6)) iat = iat * 256 + x;
    const flags = r.byte();
    const title = r.str(MAX_TITLE);
    const keyCount = r.byte();
    if (keyCount === 0 || keyCount > MAX_LIVE_TEAMS) return null;
    const keys = Array.from({ length: keyCount }, () => r.str(MAX_KEY));
    const teams = r.teams();
    const m = flags & FLAG_M ? (flags & FLAG_M_SAME ? teams : r.teams(true)) : undefined;
    if (!r.done || new Set(teams.map((t) => t[0])).size !== teams.length) return null;
    const pub = new Uint8Array(65);
    pub[0] = 4;
    pub.set(xy, 1);
    const config: LiveConfig = {
      title,
      teams: keys,
      iat,
      ...(m ? { m } : {}),
      ...(flags & FLAG_RETIRED ? { retired: true as const } : {}),
    };
    return {
      view: { topic, viewKey, orgPub: toBase64Url(pub), title },
      orgKey: { d, x: toBase64Url(xy.subarray(0, 32)), y: toBase64Url(xy.subarray(32)) },
      config,
      teams,
    };
  } catch {
    return null;
  }
}
