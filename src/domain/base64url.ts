/** base64url ohne Auffüllzeichen (RFC 4648 §5), für Links und Meldungen (Spec 006). */

const ALPHABET = /^[A-Za-z0-9_-]+$/;

export const isBase64Url = (s: string): boolean => ALPHABET.test(s) && s.length % 4 !== 1;

export function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Wirft bei ungültigen Zeichen oder unmöglicher Länge. */
export function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  if (!isBase64Url(s)) throw new Error('Kein gültiges base64url');
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const textToBase64Url = (text: string): string => toBase64Url(new TextEncoder().encode(text));

/** Wirft bei ungültigem base64url oder ungültigem UTF-8. */
export const textFromBase64Url = (s: string): string =>
  new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(fromBase64Url(s));

/** Anzahl Bytes, die ein base64url-Text dieser Länge kodiert. */
export const decodedLength = (s: string): number => Math.floor((s.length * 3) / 4);
