import { useState } from 'preact/hooks';
import { rememberColors, setKits } from '../../domain/jersey-colors';
import { shortTeamName } from '../../domain/team-name';
import type { Game } from '../../domain/types';
import { getSettings, putSettings } from '../../platform/db';
import { KitRow } from './kit-row';
import { Sheet } from './sheet';

/**
 * Spec 017 FR-C12, FR-C13: Trikots für dieses Spiel setzen. Eine neue Gegnerfarbe wird als Vorschlag für diesen
 * Gegner gemerkt (FR-031); die eigene Farbe gilt nur für dieses Spiel ("Meine Mannschaften" bleibt).
 */
export function applyKits(game: Game, own: string, opp: string, update: (game: Game) => void): void {
  const next = setKits(game, own, opp);
  if (next === game) return;
  update(next);
  if (next.oppColor !== game.oppColor) void getSettings().then((s) => putSettings(rememberColors(s, next)));
}

interface Props {
  game: Game;
  dark: boolean;
  onSave: (own: string, opp: string) => void;
  onClose: () => void;
}

/** Spec 017 FR-C11: Blatt "Trikots" mit beiden Mannschaften wie bei "Neues Spiel" (Spec 004 FR-M03, FR-M04). */
export function KitsSheet({ game, dark, onSave, onClose }: Props) {
  const [own, setOwn] = useState(game.ownColor);
  const [opp, setOpp] = useState(game.oppColor);
  const [open, setOpen] = useState<'own' | 'opp' | null>(null);
  return (
    <Sheet title="Trikots" subtitle="Gilt für dieses Spiel." testId="kits-sheet" onClose={onClose}>
      <div class="kit-list">
        <KitRow
          side="own"
          label={shortTeamName(game.ownTeam)}
          value={own}
          dark={dark}
          open={open === 'own'}
          onToggle={() => setOpen(open === 'own' ? null : 'own')}
          onPick={(id) => {
            setOwn(id);
            setOpen(null);
          }}
        />
        <KitRow
          side="opp"
          label={game.opponent}
          value={opp}
          dark={dark}
          open={open === 'opp'}
          onToggle={() => setOpen(open === 'opp' ? null : 'opp')}
          onPick={(id) => {
            setOpp(id);
            setOpen(null);
          }}
        />
      </div>
      {own === opp && (
        <p class="hint" data-testid="color-clash-hint">
          Beide Mannschaften in derselben Farbe. Die Tor-Knöpfe unterscheiden sich dann nur über den Namen.
        </p>
      )}
      <button type="button" class="btn btn--primary" data-testid="kits-save" onClick={() => onSave(own, opp)}>
        Übernehmen
      </button>
    </Sheet>
  );
}
