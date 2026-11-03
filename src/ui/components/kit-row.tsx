import { PALETTE, getColor, needsBorder } from '../../domain/jersey-colors';

interface Props {
  /** Präfix der Test-IDs, z. B. "own", "opp", "home", "away". */
  side: string;
  label: string;
  value: string;
  dark: boolean;
  open: boolean;
  onToggle: () => void;
  onPick: (id: string) => void;
}

/** Spec 004 FR-M03/FR-M04: Trikot als Farbfeld mit Namen und "Ändern"; die Palette klappt darunter auf. */
export function KitRow({ side, label, value, dark, open, onToggle, onPick }: Props) {
  const color = getColor(value, true);
  return (
    <>
      <div class="kit-row">
        <span class="kit-row__label">{label}</span>
        <span class="kit-row__color" data-testid={`kit-${side}-color`}>
          <span class="kit-row__mark" style={{ background: color.value }} aria-hidden="true" />
          {color.name}
        </span>
        <button
          type="button"
          class="link-btn kit-row__change"
          aria-expanded={open}
          data-testid={`kit-${side}-change`}
          onClick={onToggle}
        >
          {open ? 'Fertig' : 'Ändern'}
          <span class="visually-hidden"> ({label})</span>
        </button>
      </div>
      {open && (
        <div class="kit-palette">
          <div class="swatches" role="group" aria-label={`Trikotfarbe ${label}`}>
            {PALETTE.map((c) => (
              <button
                type="button"
                key={c.id}
                class={needsBorder(c.id, dark ? 'dark' : 'light') ? 'swatch swatch--bordered' : 'swatch'}
                style={{ background: c.value }}
                aria-label={c.name}
                aria-pressed={c.id === value}
                data-testid={`color-${side}-${c.id}`}
                onClick={() => onPick(c.id)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
