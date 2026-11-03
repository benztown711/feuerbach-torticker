import { useEffect, useState } from 'preact/hooks';
import { createGame } from '../../domain/game';
import { teamShortLabel } from '../../domain/history';
import { defaultOppColor, getColor, rememberColors } from '../../domain/jersey-colors';
import { visiblePlayers } from '../../domain/roster';
import { defaultSettings } from '../../domain/settings';
import { currentTeam, findTeam, ownColorFor, recordTeamUse, schemaFor, squadFor } from '../../domain/teams';
import { shortTeamName } from '../../domain/team-name';
import type { Settings, Team, Venue } from '../../domain/types';
import { validateNewGame } from '../../domain/validation';
import { getSettings, putGame, putSettings } from '../../platform/db';
import { testSignal } from '../../platform/signal';
import { KitRow } from '../components/kit-row';
import { useDarkTheme, usePlayers } from '../hooks';
import { navigate } from '../router';

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function Mark({ colorId }: { colorId: string }) {
  return <span class="team__mark" style={{ background: getColor(colorId, true).value }} aria-hidden="true" />;
}

/** "Neues Spiel" (FR-001, Spec 004): Mannschaft, Trikots, Spielzeit und Aufgebot kommen aus "Meine Mannschaften". */
export function NewGameScreen() {
  const dark = useDarkTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [teamId, setTeamId] = useState('');
  const [opponent, setOpponent] = useState('');
  const [venue, setVenue] = useState<Venue>('home');
  const [sections, setSections] = useState(2);
  const [minutes, setMinutes] = useState(25);
  const [ownColor, setOwnColor] = useState('rot');
  const [ownTouched, setOwnTouched] = useState(false);
  const [oppColor, setOppColor] = useState('schwarz');
  const [oppTouched, setOppTouched] = useState(false);
  const [pal, setPal] = useState<'own' | 'opp' | null>(null);
  const [busy, setBusy] = useState(false);
  const [players] = usePlayers();
  const [squad, setSquad] = useState<string[]>([]);

  const applyTeam = (s: Settings, t: Team): void => {
    setTeamId(t.id);
    setOwnTouched(false);
    const schema = schemaFor(t, s);
    setSections(schema.sections);
    setMinutes(schema.sectionMinutes);
  };

  useEffect(() => {
    void getSettings().then((s) => {
      setSettings(s);
      applyTeam(s, currentTeam(s));
    });
  }, []);

  const team = settings ? findTeam(settings, teamId) : null;

  // FR-M03: eigenes Trikot folgt Heim/Auswärts, solange es nicht von Hand geändert wurde.
  useEffect(() => {
    if (team && !ownTouched) setOwnColor(ownColorFor(team, venue));
  }, [team?.id, team?.homeColor, team?.awayColor, venue, ownTouched]);

  const visible = visiblePlayers(players ?? []);
  const lastSquad = (team && settings ? squadFor(team, settings) : []).filter((id) => visible.some((p) => p.id === id));
  // FR-030, FR-M06: Aufgebot des letzten Spiels dieser Mannschaft ist vorausgewählt.
  const lastKey = lastSquad.join(',');
  useEffect(() => {
    setSquad(lastKey === '' ? [] : lastKey.split(','));
  }, [lastKey]);
  const toggle = (id: string): void => setSquad(squad.includes(id) ? squad.filter((x) => x !== id) : [...squad, id]);

  // FR-031, FR-M04: Gegnerfarbe folgt dem Gegnernamen, solange sie nicht von Hand gewählt wurde.
  useEffect(() => {
    if (!oppTouched) setOppColor(defaultOppColor(settings ?? defaultSettings(), opponent, ownColor));
  }, [opponent, ownColor, settings, oppTouched]);

  // Formular erst nach dem Laden der Einstellungen zeigen, sonst überschreiben die Vorgaben bereits Getipptes.
  if (!settings || !team) return <main class="page" aria-busy="true" />;

  const chosen = visible.filter((p) => squad.includes(p.id)).map((p) => p.id);
  const input = {
    ownTeam: team.name,
    opponent,
    venue,
    schema: { sections, sectionMinutes: minutes },
    ownColor,
    oppColor,
    squad: chosen,
  };
  const check = validateNewGame(input);
  const ownShort = shortTeamName(team.name);
  const oppLabel = opponent.trim() || 'Gegner';
  const sides =
    venue === 'home'
      ? [
          { name: ownShort, color: ownColor },
          { name: oppLabel, color: oppColor },
        ]
      : [
          { name: oppLabel, color: oppColor },
          { name: ownShort, color: ownColor },
        ];
  const [home, away] = sides as [{ name: string; color: string }, { name: string; color: string }];

  const create = async (): Promise<void> => {
    if (!check.ok || busy) return;
    setBusy(true);
    const now = Date.now();
    const game = createGame(check.value, { id: globalThis.crypto.randomUUID(), now });
    await putGame(game);
    await putSettings(
      rememberColors(recordTeamUse(settings, team.id, { schema: check.value.schema, squad: chosen, now }), check.value),
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
        {settings.teams.length > 1 && (
          <div class="field">
            <span class="field__label t-label" id="ng-team">
              MANNSCHAFT
            </span>
            <div class="chips" role="group" aria-labelledby="ng-team" data-testid="team-chips">
              {settings.teams.map((t, i) => (
                <button
                  type="button"
                  key={t.id}
                  class="chip chip--wide"
                  aria-pressed={t.id === team.id}
                  data-testid={`team-chip-${i}`}
                  onClick={() => applyTeam(settings, t)}
                >
                  {teamShortLabel(t.name)}
                </button>
              ))}
            </div>
          </div>
        )}
        {settings.teams.length === 0 && (
          <p class="hint" data-testid="hint-teams">
            Deine Mannschaft und ihre Trikots legst du einmal in den{' '}
            <button type="button" class="link-btn" onClick={() => navigate('/einstellungen')}>
              Einstellungen
            </button>{' '}
            an.
          </p>
        )}

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
          {/* Spec 004 FR-M05: wie die Kopfzeile im Spiel (FR-040) */}
          <div class="matchup-preview">
            <div class="matchup-preview__roles t-label" aria-hidden="true">
              <span>HEIM</span>
              <span>GAST</span>
            </div>
            <div class="teams teams--preview">
              <div class="team">
                <Mark colorId={home.color} />
                <span class="team__name" data-testid="matchup-home">
                  {home.name}
                </span>
              </div>
              <button
                type="button"
                class="icon-btn teams__swap"
                aria-label="Heim und Gast tauschen"
                data-testid="btn-swap-venue"
                onClick={() => setVenue(venue === 'home' ? 'away' : 'home')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" class="icon">
                  <path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" />
                </svg>
              </button>
              <div class="team team--away">
                <span class="team__name" data-testid="matchup-away">
                  {away.name}
                </span>
                <Mark colorId={away.color} />
              </div>
            </div>
          </div>
        </div>

        <div class="field">
          <span class="field__label t-label">TRIKOTS</span>
          <div class="kit-list">
            <KitRow
              side="own"
              label={ownShort}
              value={ownColor}
              dark={dark}
              open={pal === 'own'}
              onToggle={() => setPal(pal === 'own' ? null : 'own')}
              onPick={(id) => {
                setOwnTouched(true);
                setOwnColor(id);
                setPal(null);
              }}
            />
            <KitRow
              side="opp"
              label={oppLabel}
              value={oppColor}
              dark={dark}
              open={pal === 'opp'}
              onToggle={() => setPal(pal === 'opp' ? null : 'opp')}
              onPick={(id) => {
                setOppTouched(true);
                setOppColor(id);
                setPal(null);
              }}
            />
          </div>
          <p class="field__help" data-testid="kit-source">
            {ownTouched
              ? 'Feuerbach-Trikot nur für dieses Spiel geändert.'
              : `Feuerbach-Trikot aus dem ${venue === 'home' ? 'Heimtrikot' : 'Auswärtstrikot'}.`}
          </p>
          {ownColor === oppColor && (
            <p class="hint" data-testid="color-clash-hint">
              Beide Mannschaften in derselben Farbe. Die Tor-Knöpfe unterscheiden sich dann nur über den Namen.
            </p>
          )}
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

        <button type="submit" class="btn btn--primary btn--large" data-testid="btn-create" disabled={!check.ok || busy}>
          Weiter zum Anpfiff
        </button>
      </form>
    </main>
  );
}
