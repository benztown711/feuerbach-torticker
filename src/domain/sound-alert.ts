import { normalizeSounds } from './signal-sound';
import type { ClockEventType, Side, SoundEvent, SoundSettings } from './types';

/**
 * Spec 025 US3: Töne in der Eltern-Ansicht. Welches Ereignis eine neue Meldung auslöst (FR-T07, plan.md R-T3) und die
 * Töne, die Eltern auf ihrem Gerät gewählt haben (FR-T06, R-T4). Nichts davon wird übertragen.
 */

/** Ereignisse mit Ton in der Eltern-Ansicht und beim Tickern über den Zuschauer-Link (ohne Spielzeitende). */
export type ParentSoundEvent = Exclude<SoundEvent, 'timeUp'>;
export type ParentSounds = Omit<SoundSettings, 'timeUp'>;

/** R-T4: gespeicherte Eltern-Töne (JSON) lesen; fehlt etwas oder ist es kaputt, gilt die Vorbelegung. */
export function parentSounds(raw: string | null): ParentSounds {
  let parsed: unknown;
  try {
    parsed = raw === null ? undefined : JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const s = normalizeSounds(parsed);
  return { kickoff: s.kickoff, halftime: s.halftime, fulltime: s.fulltime, goalOwn: s.goalOwn, goalOpp: s.goalOpp };
}

/** Pfiffe einer Meldung: Anzahl je Art und Art des letzten Pfiffs (R-T3). */
export interface Whistles {
  kickoff: number;
  halftime: number;
  fulltime: number;
  last: 'kickoff' | 'halftime' | 'fulltime' | null;
}

export const NO_WHISTLES: Whistles = { kickoff: 0, halftime: 0, fulltime: 0, last: null };

const WHISTLE: Partial<Record<ClockEventType, Whistles['last'] & string>> = {
  kickoff: 'kickoff',
  sectionEnd: 'halftime',
  fullTime: 'fulltime',
};

/** R-T3: Pfiffe aus den Uhr-Ereignissen der Meldung; "Uhr anhalten", Verlängerung und Zurücksetzen zählen nicht. */
export function whistleCounts(clock: readonly [ClockEventType, number, number][]): Whistles {
  const w = { ...NO_WHISTLES };
  for (const [type] of clock) {
    const kind = WHISTLE[type];
    if (kind) {
      w[kind] += 1;
      w.last = kind;
    }
  }
  return w;
}

/** Was die Eltern-Ansicht von einer Karte braucht. */
export interface SoundCard {
  gameId: string;
  /** Neuestes Tor zuerst. */
  goals: readonly { side: Side }[];
  whistles: Whistles;
  /** Serverzeit der Meldung (ms). */
  updatedAt: number;
}

type Tally = { goals: number } & Omit<Whistles, 'last'>;

/** Stand je Spiel, mit dem die nächste Meldung verglichen wird. */
export function soundTallies(cards: readonly SoundCard[]): Map<string, Tally> {
  return new Map(cards.map((c) => [c.gameId, { goals: c.goals.length, ...c.whistles }]));
}

/** Wie Spec 020 FR-E21: ältere Meldungen (nach einer Funklücke) lösen nichts aus. */
const FRESH_MS = 60_000;

function eventOf(before: Tally, c: SoundCard): ParentSoundEvent | null {
  const w = c.whistles;
  const fresh = (k: 'kickoff' | 'halftime' | 'fulltime'): boolean => w[k] > before[k];
  // Ein neuer Pausen- oder Schlusspfiff als letzter Pfiff folgt auf alle Tore der Meldung.
  if ((w.last === 'halftime' || w.last === 'fulltime') && fresh(w.last)) return w.last;
  if (c.goals.length > before.goals) return c.goals[0]!.side === 'own' ? 'goalOwn' : 'goalOpp';
  if (fresh('kickoff')) return 'kickoff';
  return null;
}

/**
 * FR-T07: das Ereignis, dessen Ton zu einer neuen Meldung spielt, oder `null`. `prev` ist der Stand davor (`null` beim
 * ersten Laden: nichts ist neu). Bei mehreren Karten zählt die zuletzt gemeldete mit einem neuen Ereignis.
 */
export function newSoundEvent(
  prev: ReadonlyMap<string, Tally> | null,
  cards: readonly SoundCard[],
  serverNow: number,
): ParentSoundEvent | null {
  if (!prev) return null;
  let best: { at: number; e: ParentSoundEvent } | null = null;
  for (const c of cards) {
    const before = prev.get(c.gameId);
    if (!before || serverNow - c.updatedAt >= FRESH_MS) continue;
    const e = eventOf(before, c);
    if (e && (!best || c.updatedAt >= best.at)) best = { at: c.updatedAt, e };
  }
  return best?.e ?? null;
}
