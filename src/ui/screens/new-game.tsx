import { useEffect, useState } from 'preact/hooks';
import { createGame } from '../../domain/game';
import {
  PALETTE,
  defaultOppColor,
  defaultOwnColor,
  getColor,
  needsBorder,
  rememberColors,
} from '../../domain/jersey-colors';
import { visiblePlayers } from '../../domain/roster';
import { defaultSettings } from '../../domain/settings';
import { defaultOwnTeam, pushRecent, shortTeamName } from '../../domain/team-name';
import type { Settings, Venue } from '../../domain/types';
import { validateNewGame } from '../../domain/validation';
import { getSettings, putGame, putSettings } from '../../platform/db';
import { testSignal } from '../../platform/signal';
import { useDarkTheme, usePlayers } from '../hooks';
import { navigate } from '../router';

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function ColorPicker(props: {
  side: 'own' | 'opp';
  label: string;
  value: string;
  dark: boolean;
  onPick: (id: string) => void;
}) {
  const selected = getColor(props.value, true);
  return (
    <fieldset class="field">
      <legend class="field__label t-label">
        {props.label} · {selected.name.toUpperCase()}
      </legend>
      <div class="swatches">
        {PALETTE.map((c) => (
          <button
            type="button"
            key={c.id}
            class={needsBorder(c.id, props.dark ? 'dark' : 'light') ? 'swatch swatch--bordered' : 'swatch'}
            style={{ background: c.value }}
            aria-label={c.name}
            aria-pressed={c.id === props.value}
            data-testid={`color-${props.side}-${c.id}`}
            onClick={() => props.onPick(c.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function NewGameScreen() {
  const dark = useDarkTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [ownTeam, setOwnTeam] = useState('');
  const [opponent, setOpponent] = useState('');
  const [venue, setVenue] = useState<Venue>('home');
  const [sections, setSections] = useState(2);
  const [minutes, setMinutes] = useState(25);
  const [ownColor, setOwnColor] = useState('rot');
  const [oppColor, setOppColor] = useState('schwarz');
  const [oppTouched, setOppTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [players] = usePlayers();
  const [squad, setSquad] = useState<string[]>([]);

  useEffect(() => {
    void getSettings().then((s) => {
      setSettings(s);
      setOwnTeam(defaultOwnTeam(s));
      setSections(s.lastSchema.sections);
      setMinutes(s.lastSchema.sectionMinutes);
      const own = defaultOwnColor(s);
      setOwnColor(own);
      setOppColor(defaultOppColor(s, '', own));
    });
  }, []);

  const visible = visiblePlayers(players ?? []);
  const lastSquad = (settings?.lastSquad ?? []).filter((id) => visible.some((p) => p.id === id));
  // FR-030: Aufgebot des letzten Spiels ist vorausgewählt.
  const lastKey = lastSquad.join(',');
  useEffect(() => {
    setSquad(lastKey === '' ? [] : lastKey.split(','));
  }, [lastKey]);
  const toggle = (id: string): void => setSquad(squad.includes(id) ? squad.filter((x) => x !== id) : [...squad, id]);

  // FR-031: Gegnerfarbe folgt dem Gegnernamen, solange sie nicht von Hand gewählt wurde.
  useEffect(() => {
    if (!oppTouched) setOppColor(defaultOppColor(settings ?? defaultSettings(), opponent, ownColor));
  }, [opponent, ownColor, settings, oppTouched]);

  const chosen = visible.filter((p) => squad.includes(p.id)).map((p) => p.id);
  const input = {
    ownTeam,
    opponent,
    venue,
    schema: { sections, sectionMinutes: minutes },
    ownColor,
    oppColor,
    squad: chosen,
  };
  const check = validateNewGame(input);
  const ownLabel = ownTeam.trim() || 'Eigene Mannschaft';
  const oppLabel = opponent.trim() || 'Gegner';
  const [home, away] = venue === 'home' ? [ownLabel, oppLabel] : [oppLabel, ownLabel];

  const create = async (): Promise<void> => {
    if (!check.ok || !settings || busy) return;
    setBusy(true);
    const now = Date.now();
    const game = createGame(check.value, { id: globalThis.crypto.randomUUID(), now });
    await putGame(game);
    await putSettings(
      rememberColors(
        {
          ...settings,
          recentOwnTeams: pushRecent(settings.recentOwnTeams, check.value.ownTeam),
          lastSchema: check.value.schema,
          lastSquad: chosen,
        },
        check.value,
      ),
    );
    navigate(`/spiel/${game.id}`, true);
  };

  return (
    <main class="page">
      <header class="topbar">
        <button type="button" class="icon-btn" aria-label="Zurück" onClick={() => navigate('/')}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 class="topbar__title t-zwischentitel">Neues Spiel</h1>
      </header>

      <form
        class="form"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <div class="field">
          <label class="field__label t-label" for="own-team">
            EIGENE MANNSCHAFT
          </label>
          <input
            id="own-team"
            class="input"
            data-testid="input-own-team"
            value={ownTeam}
            maxLength={40}
            autocomplete="off"
            onInput={(e) => setOwnTeam(e.currentTarget.value)}
          />
          {settings && settings.recentOwnTeams.length > 0 && (
            <div class="chips" aria-label="Zuletzt genutzt">
              {settings.recentOwnTeams.map((name, i) => (
                <button
                  type="button"
                  key={name}
                  class="chip"
                  aria-pressed={name === ownTeam.trim()}
                  data-testid={`own-team-recent-${i}`}
                  onClick={() => setOwnTeam(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          {check.errors.ownTeam && ownTeam.length > 0 && <p class="field__error">{check.errors.ownTeam}</p>}
        </div>

        <div class="field">
          <label class="field__label t-label" for="opponent">
            GEGNER
          </label>
          <input
            id="opponent"
            class="input"
            data-testid="input-opponent"
            value={opponent}
            maxLength={40}
            autocomplete="off"
            placeholder="z. B. TSV Musterstadt"
            onInput={(e) => setOpponent(e.currentTarget.value)}
          />
        </div>

        <div class="field">
          <span class="field__label t-label">BEGEGNUNG</span>
          <div class="matchup">
            <div class="matchup__team">
              <span class="t-label matchup__role">HEIM</span>
              <span class="matchup__name">{home}</span>
            </div>
            <button
              type="button"
              class="icon-btn matchup__swap"
              aria-label="Heim und Gast tauschen"
              data-testid="btn-swap-venue"
              onClick={() => setVenue(venue === 'home' ? 'away' : 'home')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" class="icon">
                <path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" />
              </svg>
            </button>
            <div class="matchup__team matchup__team--away">
              <span class="t-label matchup__role">GAST</span>
              <span class="matchup__name">{away}</span>
            </div>
          </div>
        </div>

        <div class="field">
          <span class="field__label t-label">SPIELZEIT</span>
          <div class="schema">
            <label class="visually-hidden" for="sections">
              Anzahl Abschnitte
            </label>
            <select
              id="sections"
              class="select"
              data-testid="schema-sections"
              value={String(sections)}
              onChange={(e) => setSections(Number(e.currentTarget.value))}
            >
              {range(1, 4).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
            <span class="schema__times" aria-hidden="true">
              ×
            </span>
            <label class="visually-hidden" for="minutes">
              Minuten pro Abschnitt
            </label>
            <select
              id="minutes"
              class="select"
              data-testid="schema-minutes"
              value={String(minutes)}
              onChange={(e) => setMinutes(Number(e.currentTarget.value))}
            >
              {range(1, 60).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
            <span class="schema__unit">Minuten</span>
          </div>
          <button
            type="button"
            class="btn btn--secondary signal-test"
            data-testid="btn-test-signal"
            onClick={testSignal}
          >
            Signal testen
          </button>
          <p class="t-klein signal-test__hint">
            Tipp: Lautstärke mit den Tasten am Handy einstellen, solange die App offen ist.
          </p>
        </div>

        <ColorPicker side="own" label="TRIKOT EIGENE MANNSCHAFT" value={ownColor} dark={dark} onPick={setOwnColor} />
        <ColorPicker
          side="opp"
          label="TRIKOT GEGNER"
          value={oppColor}
          dark={dark}
          onPick={(id) => {
            setOppTouched(true);
            setOppColor(id);
          }}
        />
        {ownColor === oppColor && (
          <p class="hint" data-testid="color-clash-hint">
            Beide Mannschaften in derselben Farbe. Die Tor-Knöpfe unterscheiden sich dann nur über den Namen.
          </p>
        )}

        <div class="preview" aria-hidden="true">
          {(venue === 'home' ? (['own', 'opp'] as const) : (['opp', 'own'] as const)).map((side) => {
            const id = side === 'own' ? ownColor : oppColor;
            const c = getColor(id, true);
            return (
              <div
                key={side}
                class={
                  needsBorder(id, dark ? 'dark' : 'light') ? 'preview__tile preview__tile--bordered' : 'preview__tile'
                }
                style={{ background: c.value, color: c.text }}
              >
                {side === 'own' ? shortTeamName(ownLabel) : oppLabel}
              </div>
            );
          })}
        </div>

        <div class="field">
          <div class="squad__head">
            <span class="field__label t-label squad__count" data-testid="squad-count">
              AUFGEBOT · {chosen.length} VON {visible.length}
            </span>
            {lastSquad.length > 0 && (
              <button
                type="button"
                class="btn btn--quiet btn--small"
                data-testid="squad-take-last"
                onClick={() => setSquad(lastSquad)}
              >
                Wie letztes Spiel
              </button>
            )}
          </div>
          {visible.length === 0 ? (
            <p class="hint">
              Noch kein Kader angelegt. Torschützen kannst du wählen, sobald der Kader steht.{' '}
              <button type="button" class="link-btn" onClick={() => navigate('/kader')}>
                Kader anlegen
              </button>
            </p>
          ) : (
            <>
              <div class="squad" data-testid="squad-picker" role="group" aria-label="Aufgebot">
                {visible.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    class="squad__option"
                    aria-pressed={squad.includes(p.id)}
                    data-testid={`squad-option-${p.id}`}
                    onClick={() => toggle(p.id)}
                  >
                    {p.number === null ? p.name : `${p.number} ${p.name}`}
                  </button>
                ))}
              </div>
              {chosen.length === 0 && (
                <p class="field__help">Ohne Auswahl steht in der Torschützen-Auswahl der ganze Kader.</p>
              )}
            </>
          )}
        </div>

        <button
          type="submit"
          class="btn btn--primary btn--large"
          data-testid="btn-create"
          disabled={!check.ok || !settings || busy}
        >
          Weiter zum Anpfiff
        </button>
      </form>
    </main>
  );
}
