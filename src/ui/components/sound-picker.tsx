import { SIGNAL_SOUNDS, SOUND_EVENTS, soundChoiceName } from '../../domain/sound-catalog';
import type { SoundChoice, SoundEvent } from '../../domain/types';
import { previewSignal } from '../../platform/signal';
import { Sheet } from './sheet';

const CHEVRON = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon sound-event__chevron">
    <path d="M9 5l7 7-7 7" />
  </svg>
);

/**
 * Spec 025 FR-T03: Zeilen je Ereignis mit dem gewählten Ton; Antippen öffnet die Auswahl. In den Einstellungen alle
 * sechs, in der Eltern-Ansicht ohne Spielzeitende (FR-T06).
 */
export function SoundEventList({
  events,
  sounds,
  onOpen,
}: {
  events: readonly SoundEvent[];
  sounds: Partial<Record<SoundEvent, SoundChoice>>;
  onOpen: (e: SoundEvent) => void;
}) {
  return (
    <div class="sound-events">
      {SOUND_EVENTS.filter((e) => events.includes(e.id)).map((e) => {
        const value = sounds[e.id] ?? 'aus';
        return (
          <button
            key={e.id}
            type="button"
            class="sound-event"
            data-testid={`sound-event-${e.id}`}
            onClick={() => onOpen(e.id)}
          >
            <span class="sound-event__name">{e.name}</span>
            <span
              class={value === 'aus' ? 'sound-event__value sound-event__value--off' : 'sound-event__value'}
              data-testid={`sound-event-${e.id}-value`}
            >
              {soundChoiceName(value)}
            </span>
            {CHEVRON}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Spec 025 FR-T03 (wie Spec 008 FR-K02): alle Töne als Auswahlliste, außer beim Spielzeitende zusätzlich "Aus".
 * Antippen wählt und spielt den Ton sofort zur Probe (innerhalb der Berührung, schaltet den Ton zugleich frei).
 */
export function SoundPicker({
  event,
  value,
  onPick,
  onClose,
}: {
  event: SoundEvent;
  value: SoundChoice;
  onPick: (c: SoundChoice) => void;
  onClose: () => void;
}) {
  const info = SOUND_EVENTS.find((e) => e.id === event)!;
  const options: { id: SoundChoice; name: string; description: string }[] =
    event === 'timeUp'
      ? [...SIGNAL_SOUNDS]
      : [...SIGNAL_SOUNDS, { id: 'aus', name: 'Aus', description: 'Kein Ton bei diesem Ereignis.' }];
  return (
    <Sheet title={info.name} subtitle={info.hint} testId="sound-sheet" onClose={onClose}>
      <div class="sound-list" role="radiogroup" aria-label={info.name}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            class="sound-row"
            role="radio"
            aria-checked={value === o.id}
            aria-labelledby={`sound-${o.id}-name`}
            aria-describedby={`sound-${o.id}-help`}
            data-testid={`sound-option-${o.id}`}
            onClick={() => {
              if (o.id !== 'aus') previewSignal(o.id);
              onPick(o.id);
            }}
          >
            <span class="sound-row__check" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" class="icon">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <span class="sound-row__text">
              <span class="sound-row__title" id={`sound-${o.id}-name`}>
                {o.name}
              </span>
              <span class="sound-row__help" id={`sound-${o.id}-help`}>
                {o.description}
              </span>
            </span>
            {o.id !== 'aus' && (
              <span class="sound-row__play" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M7 4.5v15l12.5-7.5z" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
