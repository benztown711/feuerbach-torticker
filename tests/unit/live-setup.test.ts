import { describe, expect, it } from 'vitest';
import type { LeadLinkData, TrainerLinkData } from '../../src/domain/live-link';
import { newSigningKey, newTopic, newViewKey, signData } from '../../src/platform/live-crypto';
import { createSpieltag, trainerLinkFor } from '../../src/domain/live-spieltag';
import { prepareLive, preparedDeps, verifyLeadLink, verifyTrainerLink } from '../../src/platform/live-setup';

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

async function trainer(o: { wrongKey?: boolean; foreignConfig?: boolean; teams?: string[] } = {}) {
  const org = await newSigningKey();
  const other = await newSigningKey();
  const config = await signData(o.foreignConfig ? other.priv : org.priv, {
    title: 'Unser Spieltag',
    teams: o.teams ?? ['E1', 'E2'],
    iat: T0,
  });
  const data: TrainerLinkData = {
    view: { topic: newTopic(), viewKey: newViewKey(), orgPub: org.pub, title: 'Gefälschter Titel' },
    orgKey: o.wrongKey ? other.priv : org.priv,
    config,
    teams: [
      { key: 'E1', name: 'Sportvg Feuerbach E1', homeColor: 'rot', awayColor: 'schwarz' },
      { key: 'E2', name: 'Sportvg Feuerbach E2', homeColor: 'rot', awayColor: 'weiss' },
    ],
  };
  return data;
}

describe('006 FR-L03 FR-L11 Trainer-Link prüfen', () => {
  it('gültiger Link: Konfiguration vom Organisator, Schlüssel passt', async () => {
    expect((await verifyTrainerLink(await trainer()))?.title).toBe('Unser Spieltag');
  });

  it('privater Schlüssel passt nicht zum Organisator-Schlüssel → ungültig', async () => {
    expect(await verifyTrainerLink(await trainer({ wrongKey: true }))).toBeNull();
  });

  it('Konfiguration nicht vom Organisator → ungültig', async () => {
    expect(await verifyTrainerLink(await trainer({ foreignConfig: true }))).toBeNull();
  });

  it('keine Mannschaft des Links in der Konfiguration → ungültig', async () => {
    expect(await verifyTrainerLink(await trainer({ teams: ['D1'] }))).toBeNull();
  });

  it('kaputter privater Schlüssel → ungültig statt Fehler', async () => {
    const t = await trainer();
    expect(await verifyTrainerLink({ ...t, orgKey: { d: 'AAAA', x: 'AAAA', y: 'AAAA' } })).toBeNull();
  });
});

describe('020 R-E1 Schlüssel vorab für "Neu starten"', () => {
  it('020 US1-S6 vorbereitete Schlüssel, Topic und Zuschauer-Schlüssel werden genutzt, danach neue', async () => {
    const prepared = await prepareLive(1);
    expect(prepared.keys).toHaveLength(2);
    const d = preparedDeps(prepared, T0);
    expect(d.now).toBe(T0);
    expect(d.newTopic()).toBe(prepared.topic);
    expect(d.newViewKey()).toBe(prepared.viewKey);
    expect(await d.newSigningKey()).toBe(prepared.keys[0]);
    expect(await d.newSigningKey()).toBe(prepared.keys[1]);
    const extra = await d.newSigningKey();
    expect(prepared.keys).not.toContain(extra);
    expect(extra.pub).toMatch(/^[A-Za-z0-9_-]{87}$/);
  });

  it('ein Live-Spieltag aus vorbereiteten Schlüsseln ist gültig signiert', async () => {
    const prepared = await prepareLive(1);
    const team = { id: 't1', name: 'Sportvg Feuerbach E1', homeColor: 'rot', awayColor: 'schwarz' };
    const live = await createSpieltag(
      { title: 'Unser Spieltag', teamIds: ['t1'] },
      [{ ...team, lastSchema: null, lastSquad: [], lastUsedAt: 0 }],
      preparedDeps(prepared, T0),
    );
    expect(live.topic).toBe(prepared.topic);
    expect(live.orgPub).toBe(prepared.keys[0]?.pub);
    expect(await verifyTrainerLink(trainerLinkFor(live)!)).not.toBeNull();
  });
});
