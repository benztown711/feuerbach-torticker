import { linkUrl, trainerLinkPath, viewerLinkPath, type LeadLinkData, type TrainerLinkData } from '../domain/live-link';
import {
  applyLeadLink,
  applyTrainerLink,
  createSpieltag,
  parseConfig,
  parseLeadCert,
  titleOf,
  trainerLinkFor,
  trainerTeamsOf,
  viewerOf,
  type LiveDeps,
  type LiveInput,
} from '../domain/live-spieltag';
import type { LeadCert, LiveConfig, LiveSpieltag, PrivateKeyParts, Settings } from '../domain/types';
import { getSettings, putSettings } from './db';
import { newSigningKey, newTopic, newViewKey, sealMessage, sign, signData, verify, verifySigned } from './live-crypto';
import { startLiveSender } from './live-sender';
import { publish } from './relay';
import { shareText, type ShareResult } from './share';

/** Spec 006 US1: Live-Spieltag anlegen, Links teilen, Lead-Link prüfen und koppeln. */

const deps = (): LiveDeps => ({
  now: Date.now(),
  newTopic,
  newViewKey,
  newSigningKey,
  signData,
  newId: () => crypto.randomUUID(),
});

/** Sendet die Konfiguration (Titel, Mannschaften), damit Zuschauer sie sofort haben (FR-L19). */
export async function publishConfig(live: LiveSpieltag): Promise<boolean> {
  return publish(live.topic, await sealMessage(live.viewKey, { config: live.config }));
}

/** FR-L01: anlegen und speichern; ersetzt einen bisherigen Live-Spieltag dieses Geräts. */
export async function createLive(input: LiveInput): Promise<Settings> {
  const settings = await getSettings();
  const live = await createSpieltag(input, settings.teams, deps());
  const next = { ...settings, live };
  await putSettings(next);
  void publishConfig(live);
  void startLiveSender(next);
  return next;
}

export interface VerifiedLead {
  cert: LeadCert;
  /** Geprüfte Konfiguration; ihr Titel gilt (nicht der ungeprüfte Titel im Link). */
  config: LiveConfig;
}

/** Passt der private Schlüssel im Link zum öffentlichen Schlüssel? */
async function keyMatches(priv: PrivateKeyParts, pub: string): Promise<boolean> {
  try {
    const probe = `probe:${pub}`;
    return await verify(pub, probe, await sign(priv, probe));
  } catch {
    return false;
  }
}

/**
 * Prüft einen Lead-Link: Zertifikat und Konfiguration vom Organisator signiert, die Mannschaft steht in
 * der Konfiguration, und der private Schlüssel gehört zum Zertifikat (sonst würden alle Meldungen verworfen).
 */
export async function verifyLeadLink(lead: LeadLinkData): Promise<VerifiedLead | null> {
  const cert = parseLeadCert(await verifySigned(lead.view.orgPub, lead.cert));
  const config = parseConfig(await verifySigned(lead.view.orgPub, lead.config));
  if (!cert || !config || !config.teams.includes(cert.key)) return null;
  return (await keyMatches(lead.key, cert.pub)) ? { cert, config } : null;
}

/**
 * Prüft einen Trainer-Link: Konfiguration vom Organisator signiert, der private Schlüssel gehört zum
 * Organisator-Schlüssel und mindestens eine Mannschaft des Links steht in der Konfiguration.
 */
export async function verifyTrainerLink(trainer: TrainerLinkData): Promise<LiveConfig | null> {
  const config = parseConfig(await verifySigned(trainer.view.orgPub, trainer.config));
  if (!config || trainerTeamsOf(trainer).length === 0) return null;
  return (await keyMatches(trainer.orgKey, trainer.view.orgPub)) ? config : null;
}

/** FR-L03: Trainer-Handy werden (fehlende Mannschaften werden übernommen). */
export async function coupleTrainer(trainer: TrainerLinkData): Promise<Settings> {
  const next = await applyTrainerLink(await getSettings(), trainer, deps());
  await putSettings(next);
  void startLiveSender(next);
  return next;
}

/** FR-L03: Kopplung speichern (Mannschaft wird bei Bedarf in "Meine Mannschaften" übernommen). */
export async function coupleLead(lead: LeadLinkData, cert: LeadCert): Promise<Settings> {
  const next = applyLeadLink(await getSettings(), lead, cert, { now: Date.now(), newId: () => crypto.randomUUID() });
  await putSettings(next);
  void startLiveSender(next);
  return next;
}

/** Basisadresse der App, z. B. https://benztown711.github.io/feuerbach-torticker/ */
export const appBase = (): string => `${window.location.origin}${import.meta.env.BASE_URL}`;

export function viewerLinkUrl(live: LiveSpieltag): string {
  return linkUrl(appBase(), viewerLinkPath(viewerOf(live)));
}

/** FR-L02: Zuschauer-Link für die Elterngruppe. */
export function shareViewerLink(live: LiveSpieltag): Promise<ShareResult> {
  const title = titleOf(live);
  return shareText(`${title} live verfolgen: ${viewerLinkUrl(live)}`, title);
}

/** FR-L02: Trainer-Link für die Trainergruppe (senden für alle Mannschaften, verwalten). */
export function shareTrainerLink(live: LiveSpieltag): Promise<ShareResult> {
  const trainer = trainerLinkFor(live);
  if (!trainer) return Promise.resolve('failed');
  const url = linkUrl(appBase(), trainerLinkPath(trainer));
  const text =
    `Trainer-Link für "${titleOf(live)}" (${trainer.teams.map((t) => t.key).join(', ')}). ` +
    `Nur in der Trainergruppe teilen. Im Torticker unter Mehr → Live-Spieltag → "Link einfügen" einfügen:\n${url}`;
  return shareText(text, `Trainer-Link ${titleOf(live)}`);
}
