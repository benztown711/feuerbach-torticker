import type { ClockEventType, Side } from './types';

/**
 * Spec 025 US3: Welches Ereignis eine neue Meldung in der Eltern-Ansicht auslöst (FR-T07, plan.md R-T3). Nichts davon
 * wird übertragen.
 */

export type { ParentSoundEvent, ParentSounds } from './parent-sounds';
import type { ParentSoundEvent } from './parent-sounds';

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

const EMPTY: Tally = { goals: 0, kickoff: 0, halftime: 0, fulltime: 0 };

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
 * ersten Laden: nichts ist neu); ein danach neu erscheinendes Spiel zählt ab null. Bei mehreren Karten zählt die zuletzt
 * gemeldete mit einem neuen Ereignis.
 */
export function newSoundEvent(
  prev: ReadonlyMap<string, Tally> | null,
  cards: readonly SoundCard[],
  serverNow: number,
): ParentSoundEvent | null {
  if (!prev) return null;
  let best: { at: number; e: ParentSoundEvent } | null = null;
  for (const c of cards) {
    if (serverNow - c.updatedAt >= FRESH_MS) continue;
    // Ein neues Spiel (z. B. angelegt und sofort angepfiffen) zählt ab null: sein Anpfiff ist in der ersten Meldung.
    const e = eventOf(prev.get(c.gameId) ?? EMPTY, c);
    if (e && (!best || c.updatedAt >= best.at)) best = { at: c.updatedAt, e };
  }
  return best?.e ?? null;
}
