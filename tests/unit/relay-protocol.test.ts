import { describe, expect, it } from 'vitest';
import {
  KEEP_PER_GROUP,
  KEEP_PLANS,
  MAX_BODY,
  MAX_GROUPS,
  MAX_ROWS,
  MAX_SQUADS,
  TOMBSTONE_MS,
  acceptsCfg,
  acceptsGame,
  gameRowsToDrop,
  hasRoom,
  objectName,
  parseServerFrame,
  parseWrite,
  plansToDrop,
  signedText,
  squadHasRoom,
  squadRowsToDrop,
  type GameRow,
} from '../../src/domain/relay-protocol';

/** Spec 007 contracts/relay-api.md, research.md R-N3 bis R-N6: Prüflogik des eigenen Dienstes. */

const b64 = (n: number, c = 'A'): string => c.repeat(n);
const TOPIC = b64(22, 't');
const ORG = `B${b64(86, 'o')}`;
const SLOT = b64(22, 's');
const GROUP = b64(22, 'g');
const SIG = b64(86, 'S');
const BODY = 't1.abc_DEF-123';
const CERT = { d: '{"key":"E1"}', s: SIG };

const game = (p: Record<string, unknown> = {}) => ({
  kind: 'game',
  slot: SLOT,
  group: GROUP,
  h: 0,
  at: 1_794_040_880_000,
  gone: false,
  body: BODY,
  sig: SIG,
  cert: CERT,
  ...p,
});
const cfg = (p: Record<string, unknown> = {}) => ({ kind: 'cfg', iat: 1_794_038_000_000, body: BODY, sig: SIG, ...p });
const plan = (p: Record<string, unknown> = {}) => ({ kind: 'plan', body: BODY, sig: SIG, ...p });
const retire = (p: Record<string, unknown> = {}) => ({ kind: 'retire', body: BODY, sig: SIG, ...p });
const squad = (p: Record<string, unknown> = {}) => ({
  kind: 'squad',
  slot: SLOT,
  at: 1_794_040_000_000,
  gone: false,
  body: BODY,
  sig: SIG,
  ...p,
});

describe('007 R-N4 Objektname aus Topic und Organisator-Schlüssel', () => {
  it('nur gültiges Topic (22 Zeichen) und öffentlicher Schlüssel (65 Byte, 87 Zeichen)', () => {
    expect(objectName(TOPIC, ORG)).toBe(`${TOPIC}.${ORG}`);
    expect(objectName(b64(21), ORG)).toBeNull();
    expect(objectName(TOPIC, b64(86))).toBeNull();
    expect(objectName(TOPIC, `${ORG}=`)).toBeNull();
    expect(objectName(42, ORG)).toBeNull();
  });
});

describe('007 contracts/relay-api.md Schreibanfrage prüfen', () => {
  it('gültige Anfragen je Art', () => {
    expect(parseWrite(game())).toEqual(game());
    expect(parseWrite(game({ gone: true, h: 100 }))).toEqual(game({ gone: true, h: 100 }));
    expect(parseWrite(cfg())).toEqual(cfg());
    expect(parseWrite(plan())).toEqual(plan());
    expect(parseWrite(retire())).toEqual(retire());
  });

  it('kein Objekt, unbekannte Art, unbekannte Felder', () => {
    for (const v of [
      null,
      'x',
      [game()],
      { ...plan(), kind: 'off' },
      { ...plan(), extra: 1 },
      { ...cfg(), slot: SLOT },
    ])
      expect(parseWrite(v)).toBeNull();
  });

  it('Meldung: Präfix t1., base64url, höchstens 4.000 Zeichen', () => {
    // base64url-Teil mit 3.996 Zeichen (Länge ≡ 0 mod 4) ist gültig, 3.998 Zeichen sind zu lang.
    expect(parseWrite(plan({ body: `t1.${b64(MAX_BODY - 4)}` }))).not.toBeNull();
    for (const body of [`t1.${b64(MAX_BODY - 2)}`, `t1.${b64(5)}`, 'abc', 't1.', 't1.a+b', 7])
      expect(parseWrite(plan({ body }))).toBeNull();
  });

  it('Signatur: 64 Byte base64url', () => {
    for (const sig of [b64(85), `${SIG}=`, undefined]) expect(parseWrite(plan({ sig }))).toBeNull();
  });

  it('Spiel: slot und group je 22 Zeichen, h 0 bis 100 ganzzahlig, at ganze Zahl > 0, gone boolesch, Zertifikat', () => {
    const bad: Record<string, unknown>[] = [
      { slot: b64(21) },
      { slot: 'a'.repeat(21) + '+' },
      { group: undefined },
      { h: -1 },
      { h: 101 },
      { h: 1.5 },
      { h: '1' },
      { at: 0 },
      { at: 1.5 },
      { at: Number.MAX_SAFE_INTEGER + 2 },
      { gone: 'nein' },
      { cert: null },
      { cert: { d: '', s: SIG } },
      { iat: 1 },
    ];
    for (const p of bad) expect(parseWrite(game(p)), JSON.stringify(p)).toBeNull();
  });

  it('Spiel ohne Zertifikat (Trainer-Handy mit Organisator-Schlüssel, FR-N05)', () => {
    const w = parseWrite(game({ cert: undefined }));
    expect(w).not.toBeNull();
    expect(w && 'cert' in w).toBe(false);
  });

  it('Konfiguration: iat ganze Zahl > 0, ohne Spiel-Felder', () => {
    expect(parseWrite(cfg({ iat: -5 }))).toBeNull();
    expect(parseWrite(cfg({ iat: undefined }))).toBeNull();
    expect(parseWrite(cfg({ cert: CERT }))).toBeNull();
  });
});

describe('007 R-N4 zu signierender Text', () => {
  const name = objectName(TOPIC, ORG) as string;
  const hash = b64(43, 'h');

  it('Spiel mit allen Ordnungsangaben', () => {
    const w = parseWrite(game({ h: 2, gone: true }))!;
    expect(signedText(name, w, hash)).toBe(
      `torticker-relay-v1|${name}|game|${SLOT}|${GROUP}|2|1794040880000||1|${hash}`,
    );
    const live = parseWrite(game())!;
    expect(signedText(name, live, hash)).toBe(
      `torticker-relay-v1|${name}|game|${SLOT}|${GROUP}|0|1794040880000||0|${hash}`,
    );
  });

  it('fehlende Felder als leere Zeichenkette', () => {
    expect(signedText(name, parseWrite(cfg())!, hash)).toBe(
      `torticker-relay-v1|${name}|cfg|||||1794038000000||${hash}`,
    );
    expect(signedText(name, parseWrite(plan())!, hash)).toBe(`torticker-relay-v1|${name}|plan|||||||${hash}`);
    expect(signedText(name, parseWrite(retire())!, hash)).toBe(`torticker-relay-v1|${name}|retire|||||||${hash}`);
  });
});

describe('007 R-N5 Ordnung: neuer als der gespeicherte Stand', () => {
  it('Spiel: größerer Übergabezähler, sonst späteres oder gleiches sentAt', () => {
    expect(acceptsGame(null, { h: 0, at: 5 })).toBe(true);
    expect(acceptsGame({ h: 0, at: 5 }, { h: 1, at: 1 })).toBe(true);
    expect(acceptsGame({ h: 0, at: 5 }, { h: 0, at: 5 })).toBe(true);
    expect(acceptsGame({ h: 0, at: 5 }, { h: 0, at: 6 })).toBe(true);
    expect(acceptsGame({ h: 0, at: 5 }, { h: 0, at: 4 })).toBe(false);
    expect(acceptsGame({ h: 2, at: 5 }, { h: 1, at: 9 })).toBe(false);
  });

  it('Konfiguration: iat größer oder gleich', () => {
    expect(acceptsCfg(null, 3)).toBe(true);
    expect(acceptsCfg(3, 3)).toBe(true);
    expect(acceptsCfg(3, 4)).toBe(true);
    expect(acceptsCfg(3, 2)).toBe(false);
  });
});

describe('007 R-N5 Auswahl und Obergrenzen', () => {
  const DAY = 24 * 60 * 60_000;
  const NOW = 1_800_000_000_000;
  const row = (slot: string, grp: string, first: number, p: Partial<GameRow> = {}): GameRow => ({
    slot,
    grp,
    gone: false,
    first,
    time: first,
    ...p,
  });

  it('je Mannschaft bleiben die 10 jüngsten nicht gelöschten Spiele nach erstem Eintreffen', () => {
    const e1 = Array.from({ length: 12 }, (_, i) => row(`e1-${i}`, 'E1', NOW - i * DAY));
    const e2 = [row('e2-0', 'E2', NOW)];
    const dropped = gameRowsToDrop([...e1, ...e2], NOW);
    expect(dropped.sort()).toEqual(['e1-10', 'e1-11']);
    expect(KEEP_PER_GROUP).toBe(10);
  });

  it('Grabsteine zählen nicht mit und fallen nach 30 Tagen weg', () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => row(`live-${i}`, 'E1', NOW - i * DAY)),
      row('weg-neu', 'E1', NOW - 40 * DAY, { gone: true, time: NOW - DAY }),
      row('weg-alt', 'E1', NOW - 40 * DAY, { gone: true, time: NOW - TOMBSTONE_MS - 1 }),
    ];
    expect(gameRowsToDrop(rows, NOW)).toEqual(['weg-alt']);
  });

  it('Plan-Meldungen: nur die 50 jüngsten', () => {
    const seqs = Array.from({ length: 53 }, (_, i) => i + 1);
    expect(plansToDrop(seqs).sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(plansToDrop([5, 1])).toEqual([]);
    expect(KEEP_PLANS).toBe(50);
  });

  it('Platz: höchstens 6 Mannschaften und 200 Zeilen; Ersetzen braucht keinen Platz', () => {
    const groups = Array.from({ length: MAX_GROUPS }, (_, i) => `g${i}`);
    const g = parseWrite(game())!;
    expect(hasRoom(groups.slice(0, 5), 10, g, false)).toBe(true);
    expect(hasRoom(groups, 10, g, false)).toBe(false);
    expect(hasRoom([...groups.slice(0, 5), GROUP], 10, g, false)).toBe(true);
    expect(hasRoom([], MAX_ROWS, parseWrite(plan())!, false)).toBe(false);
    expect(hasRoom([], MAX_ROWS - 1, parseWrite(plan())!, false)).toBe(true);
    expect(hasRoom(groups, MAX_ROWS, g, true)).toBe(true);
  });
});

describe('007 R-N6 Nachrichten des Dienstes an den Client', () => {
  const msg = { seq: 3, time: 1_794_040_880, body: BODY };

  it('hello mit Serverzeit und Meldungen; ungültige Meldungen fallen weg', () => {
    const text = JSON.stringify({
      t: 'hello',
      time: 1_794_040_881,
      msgs: [msg, { seq: 0, time: 1, body: BODY }, { ...msg, body: 'x' }],
    });
    expect(parseServerFrame(text)).toEqual({ t: 'hello', time: 1_794_040_881, msgs: [msg] });
  });

  it('msg einzeln', () => {
    expect(parseServerFrame(JSON.stringify({ t: 'msg', ...msg }))).toEqual({ t: 'msg', ...msg });
    expect(parseServerFrame(JSON.stringify({ t: 'msg', ...msg, seq: 1.5 }))).toBeNull();
    expect(parseServerFrame(JSON.stringify({ t: 'msg', ...msg, time: 'jetzt' }))).toBeNull();
  });

  it('alles andere ist ungültig', () => {
    for (const text of [
      'pong',
      '{',
      '[]',
      JSON.stringify({ t: 'hello', time: 'x', msgs: [] }),
      JSON.stringify({ t: 'hello', time: 1, msgs: {} }),
      JSON.stringify({ t: 'bye' }),
    ])
      expect(parseServerFrame(text), text).toBeNull();
  });
});

describe('016 contracts/squad-message.md Kader-Meldung beim Dienst', () => {
  const name = objectName(TOPIC, ORG) as string;
  const hash = b64(43, 'h');

  it('gültig mit slot, at, gone; ohne group, h, iat, cert', () => {
    expect(parseWrite(squad())).toEqual(squad());
    expect(parseWrite(squad({ gone: true }))).toEqual(squad({ gone: true }));
    for (const bad of [
      squad({ slot: 'kurz' }),
      squad({ at: 0 }),
      squad({ at: 1.5 }),
      squad({ gone: 'nein' }),
      squad({ group: GROUP }),
      squad({ h: 0 }),
      squad({ iat: 1 }),
      squad({ cert: CERT }),
      squad({ body: 'klartext' }),
    ])
      expect(parseWrite(bad), JSON.stringify(bad)).toBeNull();
  });

  it('zu signierender Text: slot, at und gone wie beim Spiel, ohne group, h und iat', () => {
    expect(signedText(name, parseWrite(squad())!, hash)).toBe(
      `torticker-relay-v1|${name}|squad|${SLOT}|||1794040000000||0|${hash}`,
    );
    expect(signedText(name, parseWrite(squad({ gone: true }))!, hash)).toBe(
      `torticker-relay-v1|${name}|squad|${SLOT}|||1794040000000||1|${hash}`,
    );
  });

  it('Platz: höchstens 6 geteilte Kader; Ersetzen und Nicht-mehr-teilen brauchen keinen neuen Platz', () => {
    const w = parseWrite(squad()) as Parameters<typeof squadHasRoom>[2];
    const off = parseWrite(squad({ gone: true })) as Parameters<typeof squadHasRoom>[2];
    expect(MAX_SQUADS).toBe(6);
    expect(squadHasRoom(MAX_SQUADS - 1, 10, w, null)).toBe(true);
    expect(squadHasRoom(MAX_SQUADS, 10, w, null)).toBe(false);
    expect(squadHasRoom(MAX_SQUADS, 10, w, { gone: false })).toBe(true);
    expect(squadHasRoom(MAX_SQUADS, 10, w, { gone: true })).toBe(false);
    expect(squadHasRoom(MAX_SQUADS - 1, 10, w, { gone: true })).toBe(true);
    expect(squadHasRoom(0, MAX_ROWS, w, null)).toBe(false);
    expect(squadHasRoom(MAX_SQUADS, MAX_ROWS, off, null)).toBe(false);
    expect(squadHasRoom(MAX_SQUADS, MAX_ROWS - 1, off, null)).toBe(true);
    expect(squadHasRoom(MAX_SQUADS, MAX_ROWS, off, { gone: false })).toBe(true);
  });

  it('nicht mehr geteilte Kader (Grabsteine) fallen nach 30 Tagen weg', () => {
    const NOW = 1_800_000_000_000;
    const rows = [
      { slot: 'a', gone: false, time: NOW - TOMBSTONE_MS - 1 },
      { slot: 'b', gone: true, time: NOW - 1000 },
      { slot: 'c', gone: true, time: NOW - TOMBSTONE_MS - 1 },
    ];
    expect(squadRowsToDrop(rows, NOW)).toEqual(['c']);
  });
});
