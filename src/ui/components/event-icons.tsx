import { getColor } from '../../domain/jersey-colors';
import type { CardColor } from '../../domain/types';

export function BookmarkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" class="icon">
      <path d="M6.5 3.5h11v17l-5.5-4.2-5.5 4.2z" />
    </svg>
  );
}

/** Spec 003 FR-E09: neutrale Karte (Umriss) für den Knopf "Karte". */
export function CardIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" class="icon">
      <path d="M7 4.5h10v15H7z" />
    </svg>
  );
}

/** Wechsel: Pfeil hoch (rein), Pfeil runter (raus). */
export function SubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" class="icon">
      <path d="M8 20V5M4 9l4-4 4 4M16 4v15M12 15l4 4 4-4" />
    </svg>
  );
}

/**
 * Spec 003 FR-E03: Kartensymbol in Gelb/Rot aus der Trikotpalette (design/trikot-farben.json),
 * Gelb-Rot als zwei Karten, Zeitstrafe als Uhr.
 */
export function CardGlyph({ card, size = 16 }: { card: CardColor; size?: number }) {
  if (card === 'zeit') {
    return (
      <svg width={size + 2} height={size + 2} viewBox="0 0 24 24" aria-hidden="true" class="icon">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  }
  const w = Math.round(size * 0.72);
  const fill = (id: string): string => getColor(id, true).value;
  if (card === 'gelbrot') {
    return (
      <svg width={w + 5} height={size + 3} viewBox={`0 0 ${w + 5} ${size + 3}`} aria-hidden="true" class="card-glyph">
        <rect x="0.5" y="0.5" width={w - 1} height={size - 1} style={{ fill: fill('gelb') }} />
        <rect x="5.5" y="3.5" width={w - 1} height={size - 1} style={{ fill: fill('rot') }} />
      </svg>
    );
  }
  return (
    <svg width={w} height={size} viewBox={`0 0 ${w} ${size}`} aria-hidden="true" class="card-glyph">
      <rect x="0.5" y="0.5" width={w - 1} height={size - 1} style={{ fill: fill(card) }} />
    </svg>
  );
}
