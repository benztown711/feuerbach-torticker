/**
 * Spec 019 FR-A03, FR-A04 (research.md R-A1): Der Spielbildschirm hat genau einen Meldeplatz.
 * Aus den offenen Meldungen wird höchstens eine gezeigt, dazu höchstens ein kurzer Hinweis.
 */
export type SlotMessage = 'goal' | 'mark' | 'event' | 'reshare';
export type SlotHint = 'handedOver' | 'shareResult' | 'doubleTap';

export interface SlotInput {
  /** Tor, das noch rückgängig gemacht werden kann (10 s). */
  goalUndo: boolean;
  /** Torschützen-Auswahl offen: das Tor-Rückgängig ruht so lange. */
  pickerOpen: boolean;
  /** Eben gesetztes Lesezeichen. */
  markUndo: boolean;
  /** Eben erfasste Karte oder eben erfasster Wechsel. */
  eventUndo: boolean;
  /** "Korrigiert. Ergebnis neu teilen?" (Spec 017 FR-C21). */
  reshare: boolean;
  /** Ein anderes Handy überträgt jetzt (Spec 006 US6). */
  handedOver: boolean;
  /** Ergebnis der Teilen-Aktion, z. B. "kopiert". */
  shareResult: boolean;
  /** Zweiter Tipp in der Doppeltipp-Sperre. */
  doubleTap: boolean;
}

export interface Slot {
  message: SlotMessage | null;
  hint: SlotHint | null;
}

export function messageSlot(s: SlotInput): Slot {
  const message: SlotMessage | null =
    s.goalUndo && !s.pickerOpen ? 'goal' : s.markUndo ? 'mark' : s.eventUndo ? 'event' : s.reshare ? 'reshare' : null;
  const hint: SlotHint | null = s.handedOver
    ? 'handedOver'
    : s.shareResult
      ? 'shareResult'
      : s.doubleTap
        ? 'doubleTap'
        : null;
  return { message, hint };
}
