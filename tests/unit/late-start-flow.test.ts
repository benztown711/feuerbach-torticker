import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { buildBackup, parseBackup } from '../../src/domain/export';
import { createGame } from '../../src/domain/game';
import { joinGame } from '../../src/domain/late-start';
import { applySnapshot, boardView, emptyBoard } from '../../src/domain/live-board';
import { buildSnapshot, parseSnapshot, type LiveGameSnapshot } from '../../src/domain/live-snapshot';
import { takeoverGame } from '../../src/domain/live-takeover';
import { buildShareText } from '../../src/domain/share-text';
import type { Game } from '../../src/domain/types';

/** Spec 023: Tore vor Tickerbeginn und zurückgerechneter Verlauf in Sicherung, Live-Meldung und Teilen-Text. */

const NOW = Date.UTC(2026, 10, 25, 10, 0, 0);
const min = (n: number): number => n * 60_000;
const TZ = 'Europe/Berlin';
const schema = JSON.parse(
  readFileSync(new URL('../../specs/001-spiel-erfassen/contracts/export.schema.json', import.meta.url), 'utf8'),
) as object;
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

let n = 0;
const ids = (): string => `aaaaaaaa-aaaa-4aaa-8aaa-${String(++n).padStart(12, '0')}`;

function joined(): Game {
  const g = createGame(
    {
      ownTeam: 'Sportvg Feuerbach E1',
      opponent: 'TSV Musterstadt',
      venue: 'home',
      schema: { sections: 3, sectionMinutes: 15 },
      ownColor: 'rot',
      oppColor: 'schwarz',
    },
    { id: '33333333-3333-4333-8333-333333333333', now: NOW - min(1) },
  );
  return joinGame(g, { section: 3, pause: false, rest: 7, own: 2, opp: 1 }, NOW, ids);
}

describe('023 Sicherung', () => {
  it('Einstiegs-Ereignisse und Tore vor Tickerbeginn sind gültig (Schema) und kommen wieder', () => {
    const backup = buildBackup([joined()], [], NOW + min(1));
    const json = JSON.parse(JSON.stringify(backup)) as { games: { goals: Obj[]; clockEvents: Obj[] }[] };
    expect(validate(json)).toBe(true);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok && parsed.backup.games[0]?.goals[0]?.beforeTicker).toBe(true);
    expect(parsed.ok && parsed.backup.games[0]?.clockEvents[0]?.entry).toBe(true);
    json.games[0]!.goals[0]!.beforeTicker = 'ja';
    expect(parseBackup(JSON.stringify(json)).ok).toBe(false);
    json.games[0]!.goals[0]!.beforeTicker = true;
    json.games[0]!.clockEvents[0]!.entry = 1;
    expect(parseBackup(JSON.stringify(json)).ok).toBe(false);
  });
});
type Obj = Record<string, unknown>;

describe('023 FR-J15 Live-Meldung', () => {
  it('Tore vor Tickerbeginn tragen "pre"; gewöhnliche Tore nicht', () => {
    const snap = buildSnapshot(joined(), [], 'E1', NOW);
    expect(snap.state === 'live' && snap.goals.map((g) => g.pre)).toEqual([true, true, true]);
    const parsed = parseSnapshot(JSON.parse(JSON.stringify(snap))) as LiveGameSnapshot;
    expect(parsed.goals[0]).toMatchObject({ pre: true, section: 1, minute: 1 });
    const plain = {
      ...(snap as LiveGameSnapshot),
      goals: [{ ...(snap as LiveGameSnapshot).goals[0]!, pre: undefined }],
    };
    expect((parseSnapshot(JSON.parse(JSON.stringify(plain))) as LiveGameSnapshot).goals[0]).not.toHaveProperty('pre');
    const bad = { ...(snap as LiveGameSnapshot), goals: [{ ...(snap as LiveGameSnapshot).goals[0]!, pre: 'ja' }] };
    expect(parseSnapshot(JSON.parse(JSON.stringify(bad)))).toBeNull();
  });

  it('Dashboard: "–" statt Minute und Kennzeichen; Übernahme behält das Kennzeichen am Spielbeginn', () => {
    const snap = buildSnapshot(joined(), [], 'E1', NOW) as LiveGameSnapshot;
    const board = applySnapshot(emptyBoard(), snap, NOW, TZ);
    const lines = boardView(board, NOW, TZ).cards[0]!.goals;
    expect(lines.map((l) => [l.minute, l.score, l.beforeTicker])).toEqual([
      ['–', '2:1', true],
      ['–', '2:0', true],
      ['–', '1:0', true],
    ]);
    const g = takeoverGame({
      entry: board.games[0]!,
      ownTeam: 'Sportvg Feuerbach E1',
      players: [],
      skew: 0,
      now: NOW + min(1),
      newId: ids,
    });
    // FR-J14: der Halbzeitstand bleibt nach der Übernahme unbekannt (Tore vor Tickerbeginn, R-J2).
    expect(g.halfTimeScore).toBeNull();
    expect(g.goals.map((x) => [x.beforeTicker, x.at])).toEqual([
      [true, g.clockEvents[0]!.at],
      [true, g.clockEvents[0]!.at],
      [true, g.clockEvents[0]!.at],
    ]);
  });
});

describe('023 FR-J12 Teilen-Text', () => {
  it('Tore vor Tickerbeginn mit "–" in der Minutenspalte, vor den Trennzeilen der Abschnitte', () => {
    const text = buildShareText(joined(), [], TZ, NOW);
    expect(text).toContain('–  1:0');
    expect(text.indexOf('2:1')).toBeLessThan(text.indexOf('2. Drittel'));
  });
});
