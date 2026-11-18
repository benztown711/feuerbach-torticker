import { defaultOption } from '../../domain/corrections';
import type { Game, Side } from '../../domain/types';

/**
 * Spec 017 R-C1: Korrektur-Blätter für Tore, gemeinsam für Spielbildschirm und Spieldetails (Spec 001, 009, 012).
 * Immer höchstens ein Schritt offen; die Seite hält ihn und speichert über `update`. Die Blätter selbst
 * (`goal-editor.tsx`) werden nachgeladen (Spec 021 R-W3); Schritte und Zeiten stehen hier im Hauptbundle.
 */
export type EditStep =
  | { kind: 'goal'; goalId: string }
  | { kind: 'remove'; goalId: string }
  /** `until`: Schnellauswahl direkt nach dem Tor mit Countdown (US3-S2, Spec 009 FR-V02); fehlt = Korrektur. */
  | { kind: 'scorer'; goalId: string; until?: number }
  | { kind: 'assist'; goalId: string; until?: number }
  | { kind: 'text'; goalId: string; value: string }
  | { kind: 'minute'; goalId: string; label: string }
  | { kind: 'add'; side: Side; label: string };

/** US3-S2: Schnellauswahl schließt nach 8 s ohne Torschützen. */
export const PICKER_MS = 8_000;
/** Spec 009 FR-V02: Folgeschritt "Vorlage von?" schließt nach 5 s ohne Vorlage. */
export const ASSIST_MS = 5_000;

/** Spec 012 FR-S10, FR-S11: "Tor nachtragen" mit vorgewählter letzter gespielter Minute, vor dem Anpfiff null. */
export function addGoalStep(game: Game, now: number): EditStep | null {
  const d = defaultOption(game, now);
  return d ? { kind: 'add', side: 'own', label: d.label } : null;
}
