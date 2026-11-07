import { describe, expect, it } from 'vitest';
import { isSquadList } from '../../src/domain/squad-list';
import {
  DEFAULT_SQUAD,
  MAX_SQUADS,
  addSquad,
  findSquad,
  hasSquads,
  importTarget,
  inSquad,
  listSquadName,
  mergeSquads,
  movePlayer,
  movedFrom,
  removeSquad,
  renameSquad,
  squadName,
  squadOfPlayer,
  squadOfTeam,
  squadShareText,
  squadSplit,
  squadsOf,
  teamsWith,
  validateSquadName,
} from '../../src/domain/squads';
import type { Player, Squad, Team } from '../../src/domain/types';

/** Spec 015 US5: Kader "E1/E2" und "E3" (fiktive Namen). */

const p = (id: string, name: string, number: number | null, squadId?: string, deletedAt: number | null = null) =>
  ({ id, name, number, deletedAt, ...(squadId === undefined ? {} : { squadId }) }) as Player;

const E12: Squad = { id: 'kader', name: 'E1/E2' };
const E3: Squad = { id: 'e3', name: 'E3' };
const TWO = [E12, E3];

const PLAYERS = [
  p('max', 'Max', 7),
  p('ben', 'Ben', 9),
  p('tom', 'Tom', 10, 'kader'),
  p('leo', 'Leo', 11),
  p('maxi', 'Maxi', 14),
  p('paul', 'Paul', 4, 'e3'),
  p('alt', 'Finn', null, 'e3', 1),
];

const team = (id: string, squadId?: string): Team => ({
  id,
  name: `Sportvg Feuerbach ${id.toUpperCase()}`,
  homeColor: 'rot',
  awayColor: 'schwarz',
  lastSchema: null,
  lastSquad: [],
  lastUsedAt: 0,
  ...(squadId === undefined ? {} : { squadId }),
});

describe('015 US5 FR-P20 Kader', () => {
  it('ohne gespeicherte Kader gibt es genau einen: "Kader"', () => {
    expect(squadsOf({})).toEqual([DEFAULT_SQUAD]);
    expect(squadsOf({ squads: [] })).toEqual([DEFAULT_SQUAD]);
    expect(squadsOf({ squads: TWO })).toBe(TWO);
    expect(DEFAULT_SQUAD).toEqual({ id: 'kader', name: 'Kader' });
    expect(hasSquads([DEFAULT_SQUAD])).toBe(false);
    expect(hasSquads(TWO)).toBe(true);
  });

  it('jedes Kind gehört zu genau einem Kader; ohne oder mit unbekannter Zuordnung zum ersten', () => {
    expect(squadOfPlayer(TWO, PLAYERS[0]!)).toBe('kader');
    expect(squadOfPlayer(TWO, PLAYERS[5]!)).toBe('e3');
    expect(squadOfPlayer(TWO, p('x', 'Tim', null, 'weg'))).toBe('kader');
    expect(inSquad(TWO, PLAYERS, 'kader').map((x) => x.id)).toEqual(['max', 'ben', 'tom', 'leo', 'maxi']);
    // gelöschte zählen nicht
    expect(inSquad(TWO, PLAYERS, 'e3').map((x) => x.id)).toEqual(['paul']);
    expect(squadName(TWO, 'e3')).toBe('E3');
    expect(squadName(TWO, 'weg')).toBe('E1/E2');
  });

  it('US5-S1 hinzufügen: der bisherige Kader heißt "Kader", der neue kommt dazu', () => {
    const next = addSquad(squadsOf({}), '  E3 ', 'e3');
    expect(next).toEqual([DEFAULT_SQUAD, { id: 'e3', name: 'E3' }]);
    const moved = movePlayer(PLAYERS.slice(0, 6), 'paul', 'e3');
    expect(moved.find((x) => x.id === 'paul')?.squadId).toBe('e3');
    expect(moved.find((x) => x.id === 'max')).toBe(PLAYERS[0]);
  });

  it('Name 1 bis 20 Zeichen, eindeutig ohne Groß- und Kleinschreibung; höchstens 6 Kader', () => {
    expect(validateSquadName(TWO, ' ')).toBe('Bitte einen Namen eintragen.');
    expect(validateSquadName(TWO, 'x'.repeat(21))).toBe('Höchstens 20 Zeichen.');
    expect(validateSquadName(TWO, 'e3')).toBe('Diesen Kader gibt es schon.');
    expect(validateSquadName(TWO, 'e3', 'e3')).toBeNull();
    expect(validateSquadName(TWO, 'F1')).toBeNull();
    expect(addSquad(TWO, 'e3', 'x')).toBeNull();
    const six = ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => ({ id: n, name: n }));
    expect(six).toHaveLength(MAX_SQUADS);
    expect(addSquad(six, 'G', 'g')).toBeNull();
    expect(findSquad(TWO, ' e1/e2 ')).toBe(E12);
    expect(findSquad(TWO, 'E4')).toBeUndefined();
  });

  it('umbenennen', () => {
    expect(renameSquad([DEFAULT_SQUAD, E3], 'kader', 'E1/E2')).toEqual(TWO);
    expect(renameSquad(TWO, 'kader', 'E3')).toBeNull();
    expect(renameSquad(TWO, 'weg', 'X')).toBeNull();
  });

  it('löschen nur, wenn der Kader leer ist und es danach noch einen gibt', () => {
    expect(removeSquad(TWO, PLAYERS, 'e3')).toBeNull();
    const without = movePlayer(PLAYERS, 'paul', 'kader');
    expect(removeSquad(TWO, without, 'e3')).toEqual([E12]);
    expect(removeSquad([E12], [], 'kader')).toBeNull();
    expect(removeSquad(TWO, without, 'weg')).toBeNull();
    // der erste Kader: Kinder ohne Zuordnung gehören zu ihm
    expect(removeSquad(TWO, without, 'kader')).toBeNull();
    expect(removeSquad(TWO, [p('paul', 'Paul', 4, 'e3')], 'kader')).toEqual([E3]);
  });
});

describe('015 US5 FR-P21 FR-P22 Mannschaft und Aufgebot', () => {
  it('US5-S2 Mannschaft spielt mit ihrem Kader, Vorgabe der erste; mehrere dürfen denselben haben', () => {
    expect(squadOfTeam(TWO, team('e1'))).toBe('kader');
    expect(squadOfTeam(TWO, team('e3', 'e3'))).toBe('e3');
    expect(squadOfTeam(TWO, team('e2', 'weg'))).toBe('kader');
    const teams = [team('e1', 'kader'), team('e2'), team('e3', 'e3')];
    expect(teamsWith(TWO, teams, 'kader').map((t) => t.id)).toEqual(['e1', 'e2']);
    expect(teamsWith(TWO, teams, 'e3').map((t) => t.id)).toEqual(['e3']);
  });

  it('US5-S4 Aufgebot: Kinder des Kaders, die übrigen unter "Weitere Kinder"', () => {
    const visible = PLAYERS.filter((x) => x.deletedAt === null);
    const split = squadSplit(TWO, visible, team('e2'));
    expect(split.own.map((x) => x.name)).toEqual(['Max', 'Ben', 'Tom', 'Leo', 'Maxi']);
    expect(split.more.map((x) => x.name)).toEqual(['Paul']);
    expect(squadSplit(TWO, visible, team('e3', 'e3')).own.map((x) => x.name)).toEqual(['Paul']);
  });

  it('US5-S3 mit nur einem Kader spielen alle Mannschaften mit allen Kindern', () => {
    const visible = PLAYERS.filter((x) => x.deletedAt === null);
    const split = squadSplit([E12], visible, team('e3', 'e3'));
    expect(split.own).toBe(visible);
    expect(split.more).toEqual([]);
  });
});

describe('015 US5 FR-P23 Kader teilen und Liste einfügen', () => {
  it('US5-S5 teilen: Kadername als erste Zeile, nur die Kinder dieses Kaders', () => {
    expect(squadShareText(PLAYERS, TWO, 'e3', 'name')).toBe('Kader E3:\n4 Paul');
    expect(squadShareText(PLAYERS, TWO, 'kader', 'number')).toBe('Kader E1/E2:\n7 Max\n9 Ben\n10 Tom\n11 Leo\n14 Maxi');
  });

  it('US5-S3 mit nur einem Kader wie bisher, ohne erste Zeile', () => {
    expect(squadShareText(PLAYERS.slice(0, 2), [DEFAULT_SQUAD], 'kader', 'name')).toBe('9 Ben\n7 Max');
  });

  it('erkennt "Kader <Name>:" in der ersten nicht leeren Zeile', () => {
    expect(listSquadName('\n  Kader E3:  \n4 Paul')).toBe('E3');
    expect(listSquadName('kader  E1/E2 :\n7 Max')).toBe('E1/E2');
    expect(listSquadName('Kader:\n7 Max')).toBeNull();
    expect(listSquadName('Aufstellung Samstag:\n7 Max')).toBeNull();
    expect(listSquadName('7 Max\nKader E3:')).toBeNull();
    expect(listSquadName(`Kader ${'x'.repeat(21)}:`)).toBeNull();
    expect(listSquadName('')).toBeNull();
  });

  it('Zielkader: gleichnamiger, sonst angelegt, ohne Kopfzeile der angezeigte', () => {
    const id = () => 'neu';
    expect(importTarget(TWO, 'kader', 'Kader e3:\n4 Paul', id)).toEqual({
      squads: TWO,
      squadId: 'e3',
      name: 'E3',
      created: false,
      full: false,
    });
    expect(importTarget(TWO, 'e3', '7 Max', id)).toEqual({
      squads: TWO,
      squadId: 'e3',
      name: 'E3',
      created: false,
      full: false,
    });
    expect(importTarget([DEFAULT_SQUAD], 'kader', 'Kader E3:\n4 Paul', id)).toEqual({
      squads: [DEFAULT_SQUAD, { id: 'neu', name: 'E3' }],
      squadId: 'neu',
      name: 'E3',
      created: true,
      full: false,
    });
    const six = ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => ({ id: n, name: n }));
    expect(importTarget(six, 'B', 'Kader G:\n4 Paul', id)).toEqual({
      squads: six,
      squadId: 'B',
      name: 'B',
      created: false,
      full: true,
    });
  });

  it('Vorschau "aus „E1/E2“" für Kinder, die bisher in einem anderen Kader standen', () => {
    expect(movedFrom(TWO, PLAYERS, 'max', 'e3')).toBe('E1/E2');
    expect(movedFrom(TWO, PLAYERS, 'paul', 'e3')).toBeNull();
    expect(movedFrom(TWO, PLAYERS, null, 'e3')).toBeNull();
    expect(movedFrom(TWO, PLAYERS, 'weg', 'e3')).toBeNull();
    expect(movedFrom([DEFAULT_SQUAD], PLAYERS, 'paul', 'kader')).toBeNull();
  });
});

describe('015 FR-P24 Kader aus der Sicherung', () => {
  it('ohne eigene Kader gelten die der Sicherung', () => {
    expect(mergeSquads(undefined, TWO)).toEqual({ squads: TWO, ids: {} });
    expect(mergeSquads([], TWO)).toEqual({ squads: TWO, ids: {} });
  });

  it('ohne Kader in der Sicherung bleibt alles', () => {
    expect(mergeSquads(TWO, undefined)).toEqual({ squads: null, ids: {} });
  });

  it('fehlende kommen dazu, gleichnamige werden zugeordnet, höchstens 6', () => {
    const backup = [
      { id: 'b1', name: 'e1/e2' },
      { id: 'e3', name: 'E3' },
      { id: 'b2', name: 'Mini' },
    ];
    expect(mergeSquads(TWO, backup)).toEqual({ squads: [...TWO, { id: 'b2', name: 'Mini' }], ids: { b1: 'kader' } });
    expect(mergeSquads(TWO, TWO)).toEqual({ squads: null, ids: {} });
    const five = ['A', 'B', 'C', 'D', 'E'].map((n) => ({ id: n, name: n }));
    expect(
      mergeSquads(five, [
        { id: 'x', name: 'X' },
        { id: 'y', name: 'Y' },
      ]),
    ).toEqual({ squads: [...five, { id: 'x', name: 'X' }], ids: {} });
  });
});

describe('016 FR-B14 R-B7 Kader-Liste erkennen', () => {
  it('erste Zeile "Kader <Name>:" und mindestens ein Kind', () => {
    expect(isSquadList('Kader E3:\n4 Paul\n8 Maxi')).toBe(true);
    expect(isSquadList('Kader E3:\n')).toBe(false);
    expect(isSquadList('4 Paul\n8 Maxi')).toBe(false);
    expect(isSquadList('Hallo zusammen, hier der Link')).toBe(false);
  });
});
