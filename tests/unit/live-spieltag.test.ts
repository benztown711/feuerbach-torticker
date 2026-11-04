import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/domain/game';
import {
  applyLeadLink,
  couplingKind,
  createSpieltag,
  DEFAULT_LIVE_TITLE,
  isOrganizer,
  knowsTeam,
  leadLinkFor,
  liveTeamOptions,
  newerConfig,
  parseConfig,
  parseLeadCert,
  replacesOrganizer,
  sendingTeamFor,
  titleOf,
  validateLiveInput,
  viewerOf,
  type LiveDeps,
} from '../../src/domain/live-spieltag';
import { defaultSettings } from '../../src/domain/settings';
import type { LiveSpieltag, PrivateKeyParts, SignedData, Team } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 0, 0);
const B43 = 'A'.repeat(42) + 'Q';
const B87 = 'C'.repeat(86) + 'A';
/** Gültiger öffentlicher Schlüssel (65 Byte) mit Nummer. */
const pubOf = (n: number): string => `${'C'.repeat(84)}${String(n).padStart(2, '0')}A`;

const team = (id: string, name: string, homeColor = 'rot', awayColor = 'schwarz'): Team => ({
  id,
  name,
  homeColor,
  awayColor,
  lastSchema: null,
  lastSquad: [],
  lastUsedAt: 0,
});
const E1 = team('t1', 'Sportvg Feuerbach E1');
const E2 = team('t2', 'Sportvg Feuerbach E2', 'rot', 'weiss');
const E3 = team('t3', 'Sportvg Feuerbach E3');

/** Deterministische Schlüssel: "Signatur" = Schlüssel-ID + Text. */
function deps(): LiveDeps & { signed: unknown[] } {
  let n = 0;
  const signed: unknown[] = [];
  return {
    signed,
    now: T0,
    newTopic: () => 'abcdefghijklmnopqrstuv',
    newViewKey: () => B43,
    newSigningKey: async () => {
      n++;
      return { pub: pubOf(n), priv: { d: `d${n}`, x: `x${n}`, y: `y${n}` } };
    },
    signData: async (priv: PrivateKeyParts, value: unknown): Promise<SignedData> => {
      signed.push(value);
      return { d: JSON.stringify(value), s: `sig-${priv.d}` };
    },
    newId: () => `neu-${++n}`,
  };
}

describe('006 FR-L01 Live-Spieltag anlegen', () => {
  it('Mannschaften mit Kurzlabel aus "Meine Mannschaften"; doppelte Kurzlabel werden eindeutig', () => {
    const dup = team('t9', 'Feuerbach E1');
    expect(liveTeamOptions([E1, E2, dup]).map((o) => o.key)).toEqual(['E1', 'E2', 'E1 (2)']);
  });

  it('prüft Titel (1 bis 40 Zeichen) und Mannschaften (1 bis 6, bekannt)', () => {
    const ok = validateLiveInput({ title: '  Unser   Spieltag ', teamIds: ['t1'], selfTeamId: null }, [E1]);
    expect(ok).toEqual({ ok: true, title: 'Unser Spieltag', errors: {} });
    expect(validateLiveInput({ title: ' ', teamIds: ['t1'], selfTeamId: null }, [E1]).errors.title).toBe(
      'Bitte einen Titel eintragen.',
    );
    expect(validateLiveInput({ title: 'x'.repeat(41), teamIds: ['t1'], selfTeamId: null }, [E1]).errors.title).toBe(
      'Höchstens 40 Zeichen.',
    );
    expect(validateLiveInput({ title: 'A', teamIds: [], selfTeamId: null }, [E1]).errors.teams).toBe(
      'Bitte mindestens eine Mannschaft wählen.',
    );
    const seven = Array.from({ length: 7 }, (_, i) => team(`x${i}`, `Sportvg Feuerbach F${i}`));
    expect(
      validateLiveInput({ title: 'A', teamIds: seven.map((t) => t.id), selfTeamId: null }, seven).errors.teams,
    ).toBe('Höchstens 6 Mannschaften.');
    expect(validateLiveInput({ title: 'A', teamIds: ['fehlt'], selfTeamId: null }, [E1]).ok).toBe(false);
  });

  it('erzeugt Topic, Schlüssel, Konfiguration und je Mannschaft ein Zertifikat; "Dieses Handy sendet für"', async () => {
    const d = deps();
    const live = await createSpieltag(
      { title: DEFAULT_LIVE_TITLE, teamIds: ['t1', 't2'], selfTeamId: 't1' },
      [E1, E2, E3],
      d,
    );
    expect(live).toMatchObject({
      v: 1,
      topic: 'abcdefghijklmnopqrstuv',
      viewKey: B43,
      orgPub: pubOf(1),
      createdAt: T0,
    });
    expect(live.orgKey).toEqual({ d: 'd1', x: 'x1', y: 'y1' });
    expect(JSON.parse(live.config.d)).toEqual({ title: 'Unser Spieltag', teams: ['E1', 'E2'], iat: T0 });
    expect(live.teams.map((t) => [t.key, t.name, t.sends])).toEqual([
      ['E1', 'Sportvg Feuerbach E1', true],
      ['E2', 'Sportvg Feuerbach E2', false],
    ]);
    expect(JSON.parse(live.teams[1]!.cert.d)).toEqual({
      key: 'E2',
      name: 'Sportvg Feuerbach E2',
      homeColor: 'rot',
      awayColor: 'weiss',
      pub: pubOf(3),
      iat: T0,
    });
    expect(live.teams[1]!.leadKey).toEqual({ d: 'd3', x: 'x3', y: 'y3' });
    expect(isOrganizer(live)).toBe(true);
    expect(titleOf(live)).toBe('Unser Spieltag');
    expect(viewerOf(live)).toEqual({ topic: live.topic, viewKey: B43, orgPub: pubOf(1), title: 'Unser Spieltag' });
  });

  it('ungültige Eingaben werfen; ohne "sendet für" sendet niemand', async () => {
    await expect(createSpieltag({ title: '', teamIds: ['t1'], selfTeamId: null }, [E1], deps())).rejects.toThrow();
    const live = await createSpieltag({ title: 'A', teamIds: ['t1'], selfTeamId: null }, [E1], deps());
    expect(live.teams[0]!.sends).toBe(false);
  });

  it('Lead-Link je Mannschaft enthält Zuschauerteil, Zertifikat, Schlüssel und Konfiguration', async () => {
    const live = await createSpieltag({ title: 'A', teamIds: ['t1', 't2'], selfTeamId: null }, [E1, E2], deps());
    const link = leadLinkFor(live, 'E2');
    expect(link).toEqual({
      view: viewerOf(live),
      cert: live.teams[1]!.cert,
      key: live.teams[1]!.leadKey,
      config: live.config,
    });
    expect(leadLinkFor(live, 'E9')).toBeNull();
  });

  it('Titel aus kaputter Konfiguration fällt auf die Vorgabe zurück', () => {
    const live = { config: { d: 'kein json', s: '' } } as LiveSpieltag;
    expect(titleOf(live)).toBe(DEFAULT_LIVE_TITLE);
    expect(titleOf({ config: { d: '{"title":5}', s: '' } } as LiveSpieltag)).toBe(DEFAULT_LIVE_TITLE);
  });
});

describe('006 FR-L03 FR-L04 Zertifikat und Konfiguration prüfen', () => {
  const cert = { key: 'E2', name: 'Sportvg Feuerbach E2', homeColor: 'rot', awayColor: 'schwarz', pub: B87, iat: T0 };
  it('gültiges Zertifikat', () => expect(parseLeadCert(cert)).toEqual(cert));
  it.each([
    ['kein Objekt', 'x'],
    ['Kurzlabel leer', { ...cert, key: '' }],
    ['Kurzlabel zu lang', { ...cert, key: 'x'.repeat(21) }],
    ['Name zu lang', { ...cert, name: 'x'.repeat(41) }],
    ['Name fehlt', { ...cert, name: undefined }],
    ['Farbe unbekannt', { ...cert, homeColor: 'pink' }],
    ['Auswärtsfarbe fehlt', { ...cert, awayColor: 3 }],
    ['Schlüssel falsch', { ...cert, pub: B43 }],
    ['Zeit fehlt', { ...cert, iat: 'heute' }],
  ])('Zertifikat ungültig: %s', (_, v) => expect(parseLeadCert(v)).toBeNull());

  const cfg = { title: 'Unser Spieltag', teams: ['E1', 'E2'], iat: T0 };
  it('gültige Konfiguration', () => expect(parseConfig(cfg)).toEqual(cfg));
  it.each([
    ['null', null],
    ['Titel leer', { ...cfg, title: ' ' }],
    ['Titel zu lang', { ...cfg, title: 'x'.repeat(41) }],
    ['keine Liste', { ...cfg, teams: 'E1' }],
    ['leere Liste', { ...cfg, teams: [] }],
    ['zu viele', { ...cfg, teams: ['1', '2', '3', '4', '5', '6', '7'] }],
    ['Eintrag ungültig', { ...cfg, teams: [''] }],
    ['Zeit fehlt', { ...cfg, iat: null }],
  ])('Konfiguration ungültig: %s', (_, v) => expect(parseConfig(v)).toBeNull());

  it('jüngere Konfiguration gewinnt', () => {
    const a = { ...cfg, iat: 1 };
    const b = { ...cfg, iat: 2 };
    expect(newerConfig(a, b)).toBe(b);
    expect(newerConfig(b, a)).toBe(b);
    expect(newerConfig(null, a)).toBe(a);
    expect(newerConfig(a, null)).toBe(a);
  });
});

describe('006 FR-L03 FR-L04 Kopplung aus Lead-Link', () => {
  async function organizer() {
    const d = deps();
    const live = await createSpieltag(
      { title: 'Unser Spieltag', teamIds: ['t1', 't2'], selfTeamId: 't1' },
      [E1, E2],
      d,
    );
    return { live, d };
  }
  const certOf = (live: LiveSpieltag, key: string) =>
    parseLeadCert(JSON.parse(live.teams.find((t) => t.key === key)!.cert.d))!;

  it('neues Gerät: Live-Spieltag mit gekoppelter Mannschaft; fehlende Mannschaft wird übernommen', async () => {
    const { live } = await organizer();
    const link = leadLinkFor(live, 'E2')!;
    const before = defaultSettings();
    expect(couplingKind(before, link)).toBe('new');
    const after = applyLeadLink(before, link, certOf(live, 'E2'), { now: T0 + 1, newId: () => 'neu' });
    expect(after.live).toMatchObject({
      topic: live.topic,
      viewKey: live.viewKey,
      orgPub: live.orgPub,
      config: live.config,
      createdAt: T0 + 1,
    });
    expect(after.live?.orgKey).toBeUndefined();
    expect(after.live?.teams).toEqual([{ ...live.teams[1], sends: true }]);
    expect(after.teams).toEqual([{ ...team('neu', 'Sportvg Feuerbach E2', 'rot', 'weiss') }]);
    expect(isOrganizer(after.live!)).toBe(false);
  });

  it('vorhandene Mannschaft (Name ohne Rücksicht auf Groß-/Kleinschreibung und Leerzeichen) bleibt unverändert', async () => {
    const { live } = await organizer();
    const mine = team('m', ' sportvg  feuerbach e2 ', 'blau', 'gelb');
    const after = applyLeadLink({ ...defaultSettings(), teams: [mine] }, leadLinkFor(live, 'E2')!, certOf(live, 'E2'), {
      now: T0,
      newId: () => 'neu',
    });
    expect(after.teams).toEqual([mine]);
  });

  it('zweite Mannschaft desselben Live-Spieltags wird ergänzt (FR-L04); erneutes Einfügen aktualisiert', async () => {
    const { live } = await organizer();
    let s = applyLeadLink(defaultSettings(), leadLinkFor(live, 'E2')!, certOf(live, 'E2'), {
      now: T0,
      newId: () => 'a',
    });
    expect(couplingKind(s, leadLinkFor(live, 'E1')!)).toBe('same');
    s = applyLeadLink(s, leadLinkFor(live, 'E1')!, certOf(live, 'E1'), { now: T0, newId: () => 'b' });
    expect(s.live?.teams.map((t) => [t.key, t.sends])).toEqual([
      ['E2', true],
      ['E1', true],
    ]);
    s = applyLeadLink(s, leadLinkFor(live, 'E2')!, certOf(live, 'E2'), { now: T0, newId: () => 'c' });
    expect(s.live?.teams).toHaveLength(2);
  });

  it('erneut eingefügter Link derselben Mannschaft ersetzt Schlüssel und Zertifikat (der Link gilt)', async () => {
    const { live } = await organizer();
    const s0 = applyLeadLink(defaultSettings(), leadLinkFor(live, 'E2')!, certOf(live, 'E2'), {
      now: T0,
      newId: () => 'a',
    });
    const fresh = {
      ...leadLinkFor(live, 'E2')!,
      key: { d: 'neu-d', x: 'neu-x', y: 'neu-y' },
      cert: { d: 'neues Zertifikat', s: 'x' },
    };
    const s1 = applyLeadLink(s0, fresh, certOf(live, 'E2'), { now: T0, newId: () => 'b' });
    expect(s1.live?.teams).toEqual([
      expect.objectContaining({ key: 'E2', leadKey: fresh.key, cert: fresh.cert, sends: true }),
    ]);
  });

  it('knowsTeam vergleicht Namen ohne Groß-/Kleinschreibung und Leerzeichen', () => {
    const s = { ...defaultSettings(), teams: [E1] };
    expect(knowsTeam(s, '  sportvg feuerbach   e1 ')).toBe(true);
    expect(knowsTeam(s, 'Sportvg Feuerbach E2')).toBe(false);
  });

  it('replacesOrganizer warnt nur, wenn ein organisierter Live-Spieltag ersetzt würde', async () => {
    const { live } = await organizer();
    const other: LiveSpieltag = { ...live, topic: 'zzzzzzzzzzzzzzzzzzzzzz' };
    const organizerSettings = { ...defaultSettings(), live, teams: [E1, E2] };
    expect(replacesOrganizer(organizerSettings, leadLinkFor(other, 'E1')!)).toBe(true);
    expect(replacesOrganizer(organizerSettings, leadLinkFor(live, 'E2')!)).toBe(false);
    expect(replacesOrganizer(defaultSettings(), leadLinkFor(other, 'E1')!)).toBe(false);
    const leadOnly = applyLeadLink(defaultSettings(), leadLinkFor(live, 'E2')!, certOf(live, 'E2'), {
      now: T0,
      newId: () => 'a',
    });
    expect(replacesOrganizer(leadOnly, leadLinkFor(other, 'E1')!)).toBe(false);
  });

  it('Organisator koppelt sich selbst für eine weitere Mannschaft: Schlüssel bleiben, sends wird gesetzt', async () => {
    const { live } = await organizer();
    const s = applyLeadLink(
      { ...defaultSettings(), live, teams: [E1, E2] },
      leadLinkFor(live, 'E2')!,
      certOf(live, 'E2'),
      {
        now: T0,
        newId: () => 'x',
      },
    );
    expect(s.live?.orgKey).toEqual(live.orgKey);
    expect(s.live?.teams.map((t) => t.sends)).toEqual([true, true]);
  });

  it('jüngere Konfiguration aus dem Link ersetzt eine ältere, ältere ändert nichts', async () => {
    const { live } = await organizer();
    const s0 = applyLeadLink(defaultSettings(), leadLinkFor(live, 'E2')!, certOf(live, 'E2'), {
      now: T0,
      newId: () => 'a',
    });
    const newer = { d: JSON.stringify({ title: 'Neu', teams: ['E1', 'E2'], iat: T0 + 5 }), s: 'x' };
    const s1 = applyLeadLink(s0, { ...leadLinkFor(live, 'E1')!, config: newer }, certOf(live, 'E1'), {
      now: T0,
      newId: () => 'b',
    });
    expect(s1.live?.config).toEqual(newer);
    const s2 = applyLeadLink(s1, leadLinkFor(live, 'E1')!, certOf(live, 'E1'), { now: T0, newId: () => 'c' });
    expect(s2.live?.config).toEqual(newer);
  });

  it('anderer Live-Spieltag: nur nach Bestätigung, ersetzt die alte Kopplung', async () => {
    const { live } = await organizer();
    const other: LiveSpieltag = { ...live, topic: 'zzzzzzzzzzzzzzzzzzzzzz' };
    const s0 = applyLeadLink(defaultSettings(), leadLinkFor(live, 'E2')!, certOf(live, 'E2'), {
      now: T0,
      newId: () => 'a',
    });
    expect(couplingKind(s0, leadLinkFor(other, 'E1')!)).toBe('replace');
    const s1 = applyLeadLink(s0, leadLinkFor(other, 'E1')!, certOf(other, 'E1'), { now: T0, newId: () => 'b' });
    expect(s1.live?.topic).toBe('zzzzzzzzzzzzzzzzzzzzzz');
    expect(s1.live?.teams.map((t) => t.key)).toEqual(['E1']);
  });
});

describe('006 FR-L06 FR-L09 Welche Spiele sendet dieses Gerät?', () => {
  const game = (ownTeam: string) =>
    createGame(
      {
        ownTeam,
        opponent: 'TSV Musterstadt',
        venue: 'home',
        schema: { sections: 2, sectionMinutes: 25 },
        ownColor: 'rot',
        oppColor: 'schwarz',
      },
      { id: 'g', now: T0 },
    );

  it('nur Spiele gekoppelter Mannschaften mit sends, nicht bei "Nicht live senden"', async () => {
    const live = await createSpieltag({ title: 'A', teamIds: ['t1', 't2'], selfTeamId: 't1' }, [E1, E2], deps());
    expect(sendingTeamFor(game('Sportvg Feuerbach E1'), live)?.key).toBe('E1');
    expect(sendingTeamFor(game('  sportvg feuerbach   e1'), live)?.key).toBe('E1');
    expect(sendingTeamFor({ ...game('Sportvg Feuerbach E1'), live: true }, live)?.key).toBe('E1');
    expect(sendingTeamFor({ ...game('Sportvg Feuerbach E1'), live: false }, live)).toBeNull();
    expect(sendingTeamFor(game('Sportvg Feuerbach E2'), live)).toBeNull(); // E2 sendet ein anderes Handy
    expect(sendingTeamFor(game('Sportvg Feuerbach D3'), live)).toBeNull();
    expect(sendingTeamFor(game('Sportvg Feuerbach E1'), null)).toBeNull();
  });
});
