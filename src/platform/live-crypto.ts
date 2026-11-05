import { fromBase64Url, toBase64Url } from '../domain/base64url';
import { parseLeadCert } from '../domain/live-spieltag';
import { isObj, isSignedData } from '../domain/live-validate';
import type { PrivateKeyParts, SignedData } from '../domain/types';

/**
 * Spec 006 research.md R-L5: Verschlüsselung (AES-GCM 256) und Signaturen (ECDSA P-256, SHA-256)
 * mit Web Crypto; Packen mit deflate-raw. Keine Bibliothek.
 */

/** Höchstlänge einer Meldung (ntfy nimmt 4.096 Byte als Text, Puffer für Sicherheit). */
export const MAX_MESSAGE = 3800;
const PREFIX = 't1.';
const IV_BYTES = 12;
const EC = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIG = { name: 'ECDSA', hash: 'SHA-256' } as const;

const random = (n: number): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(n));

/** Topic bei ntfy.sh: 128 Bit Zufall, 22 Zeichen. */
export const newTopic = (): string => toBase64Url(random(16));

/** Zuschauer-Schlüssel: 32 Byte Zufall. */
export const newViewKey = (): string => toBase64Url(random(32));

export interface SigningKey {
  /** Öffentlicher Schlüssel, roh (65 Byte). */
  pub: string;
  priv: PrivateKeyParts;
}

export async function newSigningKey(): Promise<SigningKey> {
  const pair = await crypto.subtle.generateKey(EC, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { pub: toBase64Url(raw), priv: { d: jwk.d as string, x: jwk.x as string, y: jwk.y as string } };
}

const privateKey = (p: PrivateKeyParts): Promise<CryptoKey> =>
  crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: p.d, x: p.x, y: p.y, ext: true }, EC, false, ['sign']);

export async function sign(priv: PrivateKeyParts, text: string): Promise<string> {
  const sig = await crypto.subtle.sign(SIG, await privateKey(priv), new TextEncoder().encode(text));
  return toBase64Url(new Uint8Array(sig));
}

/** Prüft eine Signatur; jeder Fehler (kaputter Schlüssel, kaputte Signatur) ergibt false. */
export async function verify(pub: string, text: string, sig: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey('raw', fromBase64Url(pub), EC, false, ['verify']);
    return await crypto.subtle.verify(SIG, key, fromBase64Url(sig), new TextEncoder().encode(text));
  } catch {
    return false;
  }
}

export async function signData(priv: PrivateKeyParts, value: unknown): Promise<SignedData> {
  const d = JSON.stringify(value);
  return { d, s: await sign(priv, d) };
}

/** Liefert den geprüften Inhalt oder null. */
export async function verifySigned(pub: string, signed: SignedData): Promise<unknown> {
  if (!(await verify(pub, signed.d, signed.s))) return null;
  try {
    return JSON.parse(signed.d) as unknown;
  } catch {
    return null;
  }
}

async function pipe(
  data: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Response(new Blob([data]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

const aesKey = (viewKey: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', fromBase64Url(viewKey), 'AES-GCM', false, ['encrypt', 'decrypt']);

/** Text packen und verschlüsseln: "t1." + base64url(IV ‖ Chiffrat). */
export async function seal(viewKey: string, text: string): Promise<string> {
  const packed = await pipe(new TextEncoder().encode(text), new CompressionStream('deflate-raw'));
  const iv = random(IV_BYTES);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(viewKey), packed));
  const all = new Uint8Array(IV_BYTES + ct.length);
  all.set(iv);
  all.set(ct, IV_BYTES);
  return PREFIX + toBase64Url(all);
}

/** Gegenstück zu `seal`; jeder Fehler ergibt null. */
export async function unseal(viewKey: string, text: string): Promise<string | null> {
  if (!text.startsWith(PREFIX)) return null;
  try {
    const all = fromBase64Url(text.slice(PREFIX.length));
    const iv = all.slice(0, IV_BYTES);
    const ct = all.slice(IV_BYTES);
    const packed = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await aesKey(viewKey), ct));
    return new TextDecoder('utf-8', { fatal: true }).decode(await pipe(packed, new DecompressionStream('deflate-raw')));
  } catch {
    return null;
  }
}

export interface MessageParts {
  /** Inhalt als JSON-Text (Live-Stand). */
  content?: string;
  leadKey?: PrivateKeyParts;
  cert?: SignedData;
  config?: SignedData;
}

/** Baut den Umschlag (contracts/live-message.md) und verschlüsselt ihn. */
export async function sealMessage(viewKey: string, parts: MessageParts): Promise<string> {
  const env: Record<string, unknown> = {};
  if (parts.content !== undefined && parts.leadKey && parts.cert) {
    env.m = parts.content;
    env.s = await sign(parts.leadKey, parts.content);
    env.c = parts.cert;
  }
  if (parts.config) env.g = parts.config;
  return seal(viewKey, JSON.stringify(env));
}

export interface OpenedMessage {
  /** Geprüfter Inhalt (JSON-Wert) oder null, wenn er fehlt oder eine Prüfung scheitert. */
  content: unknown;
  /** Geprüftes Zertifikat (JSON-Wert) oder null. */
  cert: unknown;
  /** Geprüfte Konfiguration (JSON-Wert) oder null. */
  config: unknown;
  /** Die geprüfte Konfiguration wie signiert, zum Weitergeben (Spec 006 US5); fehlt ohne gültiges g. */
  signedConfig?: SignedData;
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

/**
 * Entschlüsselt und prüft eine Meldung in der Reihenfolge aus contracts/live-message.md.
 * null, wenn sie sich nicht entschlüsseln lässt oder kein Umschlag ist.
 */
export async function openMessage(
  view: { viewKey: string; orgPub: string },
  text: string,
): Promise<OpenedMessage | null> {
  const plain = await unseal(view.viewKey, text);
  const env = plain === null ? null : parseJson(plain);
  if (typeof env !== 'object' || env === null || Array.isArray(env)) return null;
  const e = env as Record<string, unknown>;
  const g = isSignedData(e.g) ? e.g : null;
  const config = g ? await verifySigned(view.orgPub, g) : null;
  let content: unknown = null;
  let cert: unknown = null;
  const c = isSignedData(e.c) ? e.c : null;
  if (typeof e.m === 'string' && typeof e.s === 'string' && c) {
    const certValue = parseLeadCert(await verifySigned(view.orgPub, c));
    const parsed = certValue && (await verify(certValue.pub, e.m, e.s)) ? parseJson(e.m) : null;
    // Ein Live-Stand gilt nur für die Mannschaft seines Zertifikats (contracts/live-message.md).
    if (certValue && isObj(parsed) && parsed.team === certValue.key) {
      cert = certValue;
      content = parsed;
    }
  }
  // Eine geprüfte Konfiguration stammt immer aus g.
  return config === null ? { content, cert, config } : { content, cert, config, signedConfig: g as SignedData };
}
