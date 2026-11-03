import { deriveClock, type ClockState } from './clock';
import { score } from './goals';
import { totalSections } from './minute';
import type { ClockEvent, Game, NewGameInput } from './types';

/** "reset" (Uhr zurücksetzen) ist in Runde 4 entfallen; alte reset-Ereignisse wertet deriveClock weiter aus. */
export type ClockAction = 'kickoff' | 'pause' | 'resume' | 'end';

export function createGame(input: NewGameInput, opts: { id: string; now: number }): Game {
  return {
    id: opts.id,
    schemaVersion: 1,
    ownTeam: input.ownTeam,
    opponent: input.opponent,
    venue: input.venue,
    schema: { ...input.schema },
    ownColor: input.ownColor,
    oppColor: input.oppColor,
    createdAt: opts.now,
    clockEvents: [],
    goals: [],
    signalledThresholds: [],
    squad: [...(input.squad ?? [])],
    status: 'created',
    finalScore: null,
    halfTimeScore: null,
  };
}

export const clockOf = (game: Game, now: number): ClockState =>
  deriveClock(game.clockEvents, now, game.schema, game.signalledThresholds);

/** Welche Uhr-Aktion ist im aktuellen Zustand erlaubt (Zustandsautomat in data-model.md). */
export function canAct(game: Game, action: ClockAction, now: number): boolean {
  const c = clockOf(game, now);
  switch (action) {
    case 'kickoff':
      return c.kickoffSection !== null;
    case 'pause':
      return c.status === 'running';
    case 'resume':
      return c.status === 'paused';
    case 'end':
      return c.status === 'running' || c.status === 'paused';
  }
}

const append = (game: Game, event: ClockEvent, patch: Partial<Game> = {}): Game => {
  const clockEvents = [...game.clockEvents, event];
  const status = deriveClock(clockEvents, event.at, game.schema).status;
  return { ...game, ...patch, clockEvents, status };
};

const guard = (game: Game, action: ClockAction, now: number): ClockState => {
  if (!canAct(game, action, now)) throw new Error(`Aktion nicht erlaubt: ${action}`);
  return clockOf(game, now);
};

export function kickoff(game: Game, now: number): Game {
  const c = guard(game, 'kickoff', now);
  return append(game, { type: 'kickoff', at: now, section: c.kickoffSection as number });
}

export function pauseClock(game: Game, now: number): Game {
  const c = guard(game, 'pause', now);
  return append(game, { type: 'pause', at: now, section: c.section });
}

export function resumeClock(game: Game, now: number): Game {
  const c = guard(game, 'resume', now);
  return append(game, { type: 'resume', at: now, section: c.section });
}

/** Pausenpfiff vor dem letzten Abschnitt, sonst Schlusspfiff (FR-006). */
export function endSection(game: Game, now: number): Game {
  const c = guard(game, 'end', now);
  if (c.section < totalSections(game.schema)) {
    const patch = c.section === 1 ? { halfTimeScore: score(game) } : {};
    return append(game, { type: 'sectionEnd', at: now, section: c.section }, patch);
  }
  return append(game, { type: 'fullTime', at: now, section: c.section }, { finalScore: score(game) });
}

/** FR-035: Heim und Gast tauschen; Tore, Minuten und Farben bleiben ihrer Mannschaft. */
export function swapVenue(game: Game): Game {
  return { ...game, venue: game.venue === 'home' ? 'away' : 'home' };
}

export function markSignalled(game: Game, thresholds: string[]): Game {
  const merged = [...game.signalledThresholds];
  for (const t of thresholds) if (!merged.includes(t)) merged.push(t);
  return { ...game, signalledThresholds: merged };
}

/** "Spielzeit" bei einem Abschnitt, sonst "1. Halbzeit", "2. Drittel", "3. Viertel". */
export function sectionLabel(section: number, sections: number): string {
  if (section > sections) return `${section - sections}. Hälfte Verlängerung`;
  if (sections === 1) return 'Spielzeit';
  const unit = sections === 2 ? 'Halbzeit' : sections === 3 ? 'Drittel' : 'Viertel';
  return `${section}. ${unit}`;
}
