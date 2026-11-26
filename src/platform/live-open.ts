import { isParentCert, parseParentKit, type ParentKit } from '../domain/live-parent';
import { parseLeadCert } from '../domain/live-spieltag';
import { isObj, isSignedData, MAX_PLAN_SIGNED } from '../domain/live-validate';
import { parseViewerSquad, type ViewerSquad } from '../domain/viewer-squad';
import type { SignedData } from '../domain/types';
import { unseal, verify, verifySigned } from './live-crypto';

/**
 * Spec 006 contracts/live-message.md: Meldungen öffnen und prüfen. Eigenes Modul, damit es nur mit dem Empfänger
 * (nachgeladen) kommt und nicht mit dem Sender ins Hauptbundle (Bundle-Budget, Spec 024).
 */

export interface OpenedMessage {
  /** Geprüfter Inhalt (JSON-Wert) oder null, wenn er fehlt oder eine Prüfung scheitert. */
  content: unknown;
  /** Geprüftes Zertifikat (JSON-Wert) oder null. */
  cert: unknown;
  /** Geprüfte Konfiguration (JSON-Wert) oder null. */
  config: unknown;
  /** Die geprüfte Konfiguration wie signiert, zum Weitergeben (Spec 006 US5); fehlt ohne gültiges g. */
  signedConfig?: SignedData;
  /** Spec 015: geprüfte Nutzlast einer Plan-Meldung als JSON-Text; fehlt ohne gültiges p. */
  plan?: string;
  /** Spec 024: der Live-Stand kam mit dem Eltern-Zertifikat. */
  parent?: true;
  /** Spec 024 R-E1: geprüftes Eltern-Paket und wie signiert (zum Weitergeben); fehlt ohne gültiges k. */
  kit?: ParentKit;
  signedKit?: SignedData;
  /** Spec 024 R-E5: geprüfte Kader-Kopie; fehlt ohne gültiges q. */
  squad?: ViewerSquad;
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
  let parent = false;
  const c = isSignedData(e.c) ? e.c : null;
  if (typeof e.m === 'string' && typeof e.s === 'string' && c) {
    const rawCert = await verifySigned(view.orgPub, c);
    const certValue = parseLeadCert(rawCert);
    const parsed = certValue && (await verify(certValue.pub, e.m, e.s)) ? parseJson(e.m) : null;
    // Ein Live-Stand gilt nur für die Mannschaft seines Zertifikats (contracts/live-message.md); das
    // Eltern-Zertifikat (Spec 024 R-E1) für jede, ob Eltern dort tickern dürfen, prüft das Dashboard.
    const parentCert = isParentCert(rawCert);
    if (certValue && isObj(parsed) && (parentCert || parsed.team === certValue.key)) {
      cert = certValue;
      content = parsed;
      if (parentCert) parent = true;
    }
  }
  // Eine geprüfte Konfiguration stammt immer aus g.
  const opened: OpenedMessage =
    config === null ? { content, cert, config } : { content, cert, config, signedConfig: g as SignedData };
  // Spec 015: Planspiele nur mit gültiger Signatur des Organisators.
  const p = isSignedData(e.p, MAX_PLAN_SIGNED) ? e.p : null;
  if (p && (await verify(view.orgPub, p.d, p.s))) opened.plan = p.d;
  if (parent) opened.parent = true;
  // Spec 024: Eltern-Paket nur mit gültiger Signatur des Organisators; Kader-Kopie streng geprüft.
  const k = isSignedData(e.k) ? e.k : null;
  const kit = k ? parseParentKit(await verifySigned(view.orgPub, k)) : null;
  if (k && kit) {
    opened.kit = kit;
    opened.signedKit = k;
  }
  const squad = e.q === undefined ? null : parseViewerSquad(e.q);
  if (squad) opened.squad = squad;
  return opened;
}
