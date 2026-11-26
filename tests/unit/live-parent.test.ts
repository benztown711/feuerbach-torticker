import { describe, expect, it } from 'vitest';
import {
  PARENT_KEY,
  allowedTeams,
  checkTickerName,
  isParentCert,
  kaderAsText,
  kitOf,
  makeKit,
  parentAllowed,
  parentCertValue,
  parseParentKit,
  tickerLine,
  tickerSpieltag,
} from '../../src/domain/live-parent';
import { parseLiveSpieltag } from '../../src/domain/live-spieltag';
import { createGame } from '../../src/domain/game';
import type { Game, Goal, LiveConfig, SignedData } from '../../src/domain/types';

const PUB = 'B'.repeat(87);
const KEY = { d: 'd'.repeat(43), x: 'x'.repeat(43), y: 'y'.repeat(43) };
const signed = (v: unknown): SignedData => ({ d: JSON.stringify(v), s: 's'.repeat(86) });

const config = (p: Partial<LiveConfig> = {}): LiveConfig => ({
  title: 'Unser Spieltag',
  teams: ['E1', 'E2'],
  iat: 1000,
  m: [
    ['E1', 'Sportvg Feuerbach I', 'rot', 'weiss'],
    ['E2', 'Sportvg Feuerbach II', 'rot', 'schwarz'],
  ],
  ...p,
});

describe('024 R-E1 Eltern-Zertifikat und Eltern-Paket', () => {
  it('Eltern-Zertifikat gilt für alle Mannschaften (key "*", p 1) und hat gültige Trikotfarben', () => {
    const c = parentCertValue(PUB, 1000);
    expect(c).toEqual({
      key: PARENT_KEY,
      name: 'Eltern',
      homeColor: 'rot',
      awayColor: 'weiss',
      pub: PUB,
      iat: 1000,
      p: 1,
    });
    expect(isParentCert(c)).toBe(true);
  });

  it('kein Eltern-Zertifikat: Lead-Zertifikat einer Mannschaft, fehlendes p, kaputter Inhalt', () => {
    const c = parentCertValue(PUB, 1000);
    expect(isParentCert({ ...c, key: 'E1' })).toBe(false);
    expect(isParentCert({ ...c, p: undefined })).toBe(false);
    expect(isParentCert({ ...c, pub: 'kurz' })).toBe(false);
    expect(isParentCert(null)).toBe(false);
  });

  it('Paket: privater Schlüssel, Zertifikat und Zeit; alles andere ergibt null', () => {
    const c = signed(parentCertValue(PUB, 1000));
    expect(parseParentKit({ k: KEY, c, iat: 1000 })).toEqual({ k: KEY, c, iat: 1000 });
    expect(parseParentKit({ k: { d: 'kurz' }, c, iat: 1000 })).toBeNull();
    expect(parseParentKit({ k: KEY, c: 'x', iat: 1000 })).toBeNull();
    expect(parseParentKit({ k: KEY, c, iat: -1 })).toBeNull();
    expect(parseParentKit('kaputt')).toBeNull();
  });
});

describe('024 R-E1 Eltern-Paket auf Trainer-Handys (Sicherung)', () => {
  const base = {
    v: 1,
    topic: 'T'.repeat(22),
    viewKey: 'V'.repeat(43),
    orgPub: PUB,
    config: signed(config()),
    teams: [],
    createdAt: 1,
  };
  it('kit bleibt erhalten, ungültiges kit macht die Sicherung ungültig', () => {
    const kit = signed({ k: KEY });
    expect(parseLiveSpieltag({ ...base, kit })?.kit).toEqual(kit);
    expect(parseLiveSpieltag(base)?.kit).toBeUndefined();
    expect(parseLiveSpieltag({ ...base, kit: 'x' })).toBeNull();
  });
});

describe('024 R-E2 "Eltern dürfen tickern" je Mannschaft', () => {
  it('ohne x sind alle Mannschaften erlaubt (Vorgabe an, FR-E18)', () => {
    expect(parentAllowed(config(), 'E1')).toBe(true);
    expect(allowedTeams(config())).toEqual(['E1', 'E2']);
  });

  it('Mannschaften in x und unbekannte Mannschaften sind nicht erlaubt; ohne Konfiguration nichts', () => {
    const c = config({ x: ['E2'] });
    expect(parentAllowed(c, 'E1')).toBe(true);
    expect(parentAllowed(c, 'E2')).toBe(false);
    expect(parentAllowed(c, 'E3')).toBe(false);
    expect(allowedTeams(c)).toEqual(['E1']);
    expect(parentAllowed(null, 'E1')).toBe(false);
    expect(allowedTeams(null)).toEqual([]);
  });
});

describe('024 R-E3 Eltern-Handy sendet mit dem bestehenden Sender', () => {
  const kit = { k: KEY, c: signed(parentCertValue(PUB, 1000)), iat: 1000 };
  const ticker = {
    topic: 'T'.repeat(22),
    viewKey: 'V'.repeat(43),
    orgPub: PUB,
    kit: signed(kit),
    config: signed(config()),
  };

  it('je erlaubte Mannschaft ein Zugang mit Eltern-Schlüssel, ohne Organisator-Schlüssel', () => {
    const cfg = config({ x: ['E2'] });
    const live = tickerSpieltag({ ...ticker, config: signed(cfg) }, kit);
    expect(live.orgKey).toBeUndefined();
    expect(live.topic).toBe(ticker.topic);
    expect(live.teams).toEqual([
      {
        key: 'E1',
        name: 'Sportvg Feuerbach I',
        homeColor: 'rot',
        awayColor: 'weiss',
        leadKey: KEY,
        cert: kit.c,
        sends: true,
      },
    ]);
    expect(live.createdAt).toBe(0);
  });

  it('ohne Mannschaftsdetails (ältere Konfiguration) oder kaputte Konfiguration: keine Zugänge', () => {
    expect(tickerSpieltag({ ...ticker, config: signed(config({ m: undefined })) }, kit).teams).toEqual([]);
    expect(tickerSpieltag({ ...ticker, config: { d: 'kaputt', s: '' } }, kit).teams).toEqual([]);
  });
});

describe('024 FR-E09 Ticker-Name', () => {
  it('2 bis 20 Zeichen, Leerzeichen zusammengezogen', () => {
    expect(checkTickerName('  Paul ')).toEqual({ ok: true, name: 'Paul' });
    expect(checkTickerName('Anna  Lena')).toEqual({ ok: true, name: 'Anna Lena' });
    expect(checkTickerName('P').ok).toBe(false);
    expect(checkTickerName('x'.repeat(21))).toEqual({
      ok: false,
      name: 'x'.repeat(21),
      error: 'Höchstens 20 Zeichen.',
    });
    expect(checkTickerName('   ')).toEqual({ ok: false, name: '', error: 'Bitte mindestens 2 Zeichen.' });
  });
});

describe('024 FR-E06 Zeile "… tickert bereits"', () => {
  it('Eltern: Name hervorgehoben, "tickert bereits"; beendet "Getickert von"', () => {
    expect(tickerLine({ name: 'Paul', trainer: false }, { own: false, ended: false })).toEqual({
      before: '',
      tag: 'Paul',
      after: ' tickert bereits',
    });
    expect(tickerLine({ name: 'Paul', trainer: false }, { own: false, ended: true })).toEqual({
      before: 'Getickert von ',
      tag: 'Paul',
      after: '',
    });
  });

  it('Trainer: "Trainer <Name>" bzw. ohne Namen "Trainer"', () => {
    expect(tickerLine({ name: 'Atti', trainer: true }, { own: false, ended: false })?.tag).toBe('Trainer Atti');
    expect(tickerLine({ name: null, trainer: true }, { own: false, ended: false })?.tag).toBe('Trainer');
    expect(tickerLine({ name: null, trainer: true }, { own: false, ended: true })).toEqual({
      before: 'Getickert von ',
      tag: 'Trainer',
      after: '',
    });
  });

  it('eigenes Handy: "Du tickerst", beendet "Getickert von dir"', () => {
    expect(tickerLine({ name: 'Paul', trainer: false }, { own: true, ended: false })).toEqual({
      before: '',
      tag: 'Du',
      after: ' tickerst',
    });
    expect(tickerLine({ name: 'Paul', trainer: false }, { own: true, ended: true })?.tag).toBe('dir');
  });

  it('ältere Handys ohne Namen und ohne Trainer-Kennzeichen: keine Zeile', () => {
    expect(tickerLine({ name: null, trainer: false }, { own: false, ended: false })).toBeNull();
  });
});

describe('024 R-E1 Eltern-Paket erzeugen (Trainer-Handy)', () => {
  it('neuer Schlüssel, Zertifikat und Paket, beides vom Organisator signiert', async () => {
    const signedBy: string[] = [];
    const deps = {
      now: 77,
      newSigningKey: () => Promise.resolve({ pub: PUB, priv: KEY }),
      signData: (priv: typeof KEY, value: unknown) => {
        signedBy.push(priv.d);
        return Promise.resolve(signed(value));
      },
    };
    const org = { ...KEY, d: 'o'.repeat(43) };
    const kit = await makeKit(org, deps);
    const value = parseParentKit(JSON.parse(kit.d));
    expect(value?.k).toEqual(KEY);
    expect(value?.iat).toBe(77);
    expect(JSON.parse(value!.c.d)).toEqual(parentCertValue(PUB, 77));
    expect(signedBy).toEqual([org.d, org.d]);
  });
});

describe('024 R-E1 gespeichertes Paket lesen', () => {
  it('kitOf: Inhalt oder null (fehlt, kein JSON, ungültig)', () => {
    const kit = { k: KEY, c: signed(parentCertValue(PUB, 1)), iat: 1 };
    expect(kitOf(signed(kit))).toEqual(kit);
    expect(kitOf(undefined)).toBeNull();
    expect(kitOf({ d: 'kein json', s: '' })).toBeNull();
    expect(kitOf(signed({ k: 1 }))).toBeNull();
  });
});

describe('024 R-E5 Kinder aus der Kader-Kopie als Freitext', () => {
  const players = [
    { id: 'kader:e12:0', name: 'Max', number: 9, deletedAt: null },
    { id: 'kader:e12:1', name: 'Tom', number: null, deletedAt: null },
  ];
  const goal = (p: Partial<Goal>): Goal => ({
    id: 'g',
    side: 'own',
    at: 1,
    section: 1,
    minute: 3,
    stoppage: null,
    scorer: null,
    deletedAt: null,
    ...p,
  });
  const base = createGame(
    {
      ownTeam: 'Sportvg Feuerbach II',
      opponent: 'TSV Musterstadt',
      venue: 'home',
      schema: { sections: 2, sectionMinutes: 25 },
      ownColor: 'rot',
      oppColor: 'blau',
    },
    { id: 'x', now: 1 },
  );

  it('Torschütze und Karten aus der Kopie werden Freitext, Vorlagen aus der Kopie entfallen', () => {
    const g: Game = {
      ...base,
      goals: [
        goal({ scorer: { kind: 'player', playerId: 'kader:e12:0' }, assist: 'kader:e12:1' }),
        goal({ id: 'h', scorer: { kind: 'player', playerId: 'kader:e12:9' } }),
        goal({ id: 'i', scorer: { kind: 'ownGoal' } }),
        goal({ id: 'j', scorer: { kind: 'player', playerId: 'eigener' }, assist: 'eigener2' }),
      ],
      events: [
        {
          id: 'c',
          at: 1,
          kind: 'card',
          side: 'own',
          card: 'gelb',
          who: { kind: 'player', playerId: 'kader:e12:1' },
          comment: '',
        },
        { id: 'm', at: 1, kind: 'mark', comment: '' },
      ] as Game['events'],
      shootout: {
        first: 'own',
        done: false,
        shots: [{ side: 'own', hit: true, who: { kind: 'player', playerId: 'kader:e12:0' }, at: 1 }],
      },
    };
    const out = kaderAsText(g, players);
    expect(out.goals[0]).toMatchObject({ scorer: { kind: 'text', text: 'Max' }, assist: null });
    expect(out.goals[1]?.scorer).toBeNull();
    expect(out.goals[2]).toBe(g.goals[2]);
    expect(out.goals[3]).toBe(g.goals[3]);
    expect((out.events?.[0] as { who: unknown }).who).toEqual({ kind: 'text', text: 'Tom' });
    expect(out.events?.[1]).toEqual(g.events?.[1]);
    expect(out.shootout?.shots[0]?.who).toEqual({ kind: 'text', text: 'Max' });
  });

  it('ohne Ereignisse und Elfmeterschießen bleibt das Spiel gleich aufgebaut', () => {
    const out = kaderAsText({ ...base, goals: [goal({})] }, players);
    expect(out.events).toBeUndefined();
    expect(out.shootout).toBeUndefined();
    expect(out.goals[0]).toEqual(goal({}));
  });
});
