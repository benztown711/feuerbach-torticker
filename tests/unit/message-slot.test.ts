import { describe, expect, it } from 'vitest';
import { messageSlot, type SlotInput } from '../../src/domain/message-slot';

const none: SlotInput = {
  goalUndo: false,
  pickerOpen: false,
  markUndo: false,
  eventUndo: false,
  reshare: false,
  handedOver: false,
  shareResult: false,
  doubleTap: false,
};

describe('019 FR-A03 FR-A04 ein Meldeplatz', () => {
  it('nichts offen: kein Band', () => {
    expect(messageSlot(none)).toEqual({ message: null, hint: null });
  });

  it('FR-A03 höchstens eine Meldung in der Rangfolge Tor, Lesezeichen, Karte/Wechsel, neu teilen', () => {
    const all = { ...none, goalUndo: true, markUndo: true, eventUndo: true, reshare: true };
    expect(messageSlot(all).message).toBe('goal');
    expect(messageSlot({ ...all, goalUndo: false }).message).toBe('mark');
    expect(messageSlot({ ...all, goalUndo: false, markUndo: false }).message).toBe('event');
    expect(messageSlot({ ...none, reshare: true }).message).toBe('reshare');
  });

  it('Tor-Rückgängig ruht, solange die Torschützen-Auswahl offen ist; dann gilt die nächste Meldung', () => {
    expect(messageSlot({ ...none, goalUndo: true, pickerOpen: true }).message).toBeNull();
    expect(messageSlot({ ...none, goalUndo: true, pickerOpen: true, eventUndo: true }).message).toBe('event');
    expect(messageSlot({ ...none, goalUndo: false, pickerOpen: true, markUndo: true }).message).toBe('mark');
  });

  it('FR-A04 Hinweis in der Rangfolge Übergabe, Teilen-Ergebnis, Doppeltipp', () => {
    const hints = { ...none, handedOver: true, shareResult: true, doubleTap: true };
    expect(messageSlot(hints).hint).toBe('handedOver');
    expect(messageSlot({ ...hints, handedOver: false }).hint).toBe('shareResult');
    expect(messageSlot({ ...none, doubleTap: true }).hint).toBe('doubleTap');
  });

  it('FR-A04 Hinweis als zweite Zeile zur Meldung oder allein im Band', () => {
    expect(messageSlot({ ...none, goalUndo: true, doubleTap: true })).toEqual({ message: 'goal', hint: 'doubleTap' });
    expect(messageSlot({ ...none, shareResult: true })).toEqual({ message: null, hint: 'shareResult' });
  });
});
