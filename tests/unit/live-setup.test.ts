import { describe, expect, it } from 'vitest';
import type { LeadLinkData } from '../../src/domain/live-link';
import { newSigningKey, newTopic, newViewKey, signData } from '../../src/platform/live-crypto';
import { verifyLeadLink } from '../../src/platform/live-setup';

const T0 = Date.UTC(2026, 10, 7, 9, 0, 0);

async function link(o: { teams?: string[]; certKey?: string; wrongKey?: boolean; foreignConfig?: boolean } = {}) {
  const org = await newSigningKey();
  const lead = await newSigningKey();
  const other = await newSigningKey();
  const cert = await signData(org.priv, {
    key: o.certKey ?? 'E2',
    name: 'Sportvg Feuerbach E2',
    homeColor: 'rot',
    awayColor: 'schwarz',
    pub: lead.pub,
    iat: T0,
  });
  const config = await signData(o.foreignConfig ? other.priv : org.priv, {
    title: 'Unser Spieltag',
    teams: o.teams ?? ['E1', 'E2'],
    iat: T0,
  });
  const data: LeadLinkData = {
    view: { topic: newTopic(), viewKey: newViewKey(), orgPub: org.pub, title: 'Gefälschter Titel' },
    cert,
    key: o.wrongKey ? other.priv : lead.priv,
    config,
  };
  return data;
}

describe('006 FR-L03 FR-L11 Lead-Link prüfen', () => {
  it('gültiger Link: Zertifikat und Titel aus der signierten Konfiguration (nicht der Titel im Link)', async () => {
    const v = await verifyLeadLink(await link());
    expect(v?.cert.key).toBe('E2');
    expect(v?.config.title).toBe('Unser Spieltag');
  });

  it('privater Schlüssel passt nicht zum Zertifikat → ungültig', async () => {
    expect(await verifyLeadLink(await link({ wrongKey: true }))).toBeNull();
  });

  it('Mannschaft fehlt in der Konfiguration → ungültig', async () => {
    expect(await verifyLeadLink(await link({ certKey: 'E3' }))).toBeNull();
  });

  it('Konfiguration nicht vom Organisator → ungültig', async () => {
    expect(await verifyLeadLink(await link({ foreignConfig: true }))).toBeNull();
  });

  it('kaputter privater Schlüssel → ungültig statt Fehler', async () => {
    const l = await link();
    expect(await verifyLeadLink({ ...l, key: { d: 'AAAA', x: 'AAAA', y: 'AAAA' } })).toBeNull();
  });
});
