import { leadLinkPath, linkUrl, viewerLinkPath, type LeadLinkData } from '../domain/live-link';
import {
  applyLeadLink,
  createSpieltag,
  leadLinkFor,
  parseConfig,
  parseLeadCert,
  titleOf,
  viewerOf,
  type LiveDeps,
  type LiveInput,
} from '../domain/live-spieltag';
import { shortTeamName } from '../domain/team-name';
import type { LeadCert, LiveSpieltag, Settings } from '../domain/types';
import { getSettings, putSettings } from './db';
import { newSigningKey, newTopic, newViewKey, sealMessage, signData, verifySigned } from './live-crypto';
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
  return next;
}

/** Prüft Zertifikat und Konfiguration eines Lead-Links mit dem Organisator-Schlüssel. */
export async function verifyLeadLink(lead: LeadLinkData): Promise<LeadCert | null> {
  const cert = parseLeadCert(await verifySigned(lead.view.orgPub, lead.cert));
  const config = parseConfig(await verifySigned(lead.view.orgPub, lead.config));
  return cert && config ? cert : null;
}

/** FR-L03: Kopplung speichern (Mannschaft wird bei Bedarf in "Meine Mannschaften" übernommen). */
export async function coupleLead(lead: LeadLinkData, cert: LeadCert): Promise<Settings> {
  const next = applyLeadLink(await getSettings(), lead, cert, { now: Date.now(), newId: () => crypto.randomUUID() });
  await putSettings(next);
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

/** FR-L02: Lead-Link für das Handy am Spielfeldrand. */
export function shareLeadLink(live: LiveSpieltag, key: string): Promise<ShareResult> {
  const lead = leadLinkFor(live, key);
  const cred = live.teams.find((t) => t.key === key);
  if (!lead || !cred) return Promise.resolve('failed');
  const url = linkUrl(appBase(), leadLinkPath(lead));
  const text =
    `Lead-Link für ${shortTeamName(cred.name)} ("${titleOf(live)}"). ` +
    `Im Torticker unter Mehr → Live-Spieltag → "Lead-Link einfügen" einfügen:\n${url}`;
  return shareText(text, `Lead-Link ${shortTeamName(cred.name)}`);
}
