import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  addPlayer,
  looksLikeFullName,
  rosterShareText,
  softDeletePlayer,
  updatePlayer,
  validatePlayerName,
  visiblePlayers,
} from '../../domain/roster';
import { MAX_NAME } from '../../domain/roster-names';
import { annotateRows, applyImport, planImport, type ImportRow, type ImportWarning } from '../../domain/roster-merge';
import { parseRosterList } from '../../domain/roster-parse';
import type { Player, RosterSort } from '../../domain/types';
import { validatePlayerNumber } from '../../domain/validation';
import { getSettings, putPlayers } from '../../platform/db';
import { shareText } from '../../platform/share';
import { Confirm } from '../components/confirm';
import { usePlayers } from '../hooks';
import { navigate } from '../router';

const WARNING_TEXT: Record<ImportWarning, string> = {
  nachname: 'Nachname gekürzt',
  'nummer-doppelt': 'Nummer doppelt',
  'name-doppelt': 'Name doppelt',
  'nummer-ungueltig': 'Nummer ungültig',
  'name-leer': 'Name fehlt',
};

const newId = (): string => globalThis.crypto.randomUUID();

function parseNumber(text: string): number | null | 'invalid' {
  const t = text.trim();
  if (t === '') return null;
  const n = Number(t);
  return validatePlayerNumber(n) === null ? n : 'invalid';
}

/** Spieler anlegen oder ändern (US5-S1); Hinweis "Bitte nur Vornamen" (FR-020). */
function PlayerForm(props: {
  player: Player | null;
  onSave: (name: string, number: number | null) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(props.player?.name ?? '');
  const [number, setNumber] = useState(props.player?.number?.toString() ?? '');
  const nameError = validatePlayerName(name);
  const num = parseNumber(number);
  const ok = nameError === null && num !== 'invalid';
  return (
    <form
      class="form card"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) props.onSave(name, num);
      }}
    >
      <h2 class="t-zwischentitel roster__heading">{props.player ? 'Spieler ändern' : 'Spieler hinzufügen'}</h2>
      <div class="field">
        <label class="field__label t-label" for="player-name">
          VORNAME
        </label>
        <input
          id="player-name"
          class="input"
          data-testid="input-player-name"
          value={name}
          maxLength={MAX_NAME}
          autocomplete="off"
          onInput={(e) => setName(e.currentTarget.value)}
        />
        {looksLikeFullName(name) && (
          <p class="hint" data-testid="hint-first-name-only">
            Bitte nur Vornamen, bei Namensvettern mit Kürzel wie „Max Mü.“
          </p>
        )}
      </div>
      <div class="field">
        <label class="field__label t-label" for="player-number">
          RÜCKENNUMMER (OPTIONAL)
        </label>
        <input
          id="player-number"
          class="input input--short"
          data-testid="input-player-number"
          value={number}
          inputMode="numeric"
          maxLength={2}
          autocomplete="off"
          onInput={(e) => setNumber(e.currentTarget.value)}
        />
        {num === 'invalid' && <p class="field__error">Nummer 1 bis 99.</p>}
      </div>
      <div class="button-row">
        <button type="button" class="btn btn--secondary" onClick={props.onCancel}>
          Abbrechen
        </button>
        <button type="submit" class="btn btn--primary" data-testid="btn-save-player" disabled={!ok}>
          Speichern
        </button>
      </div>
    </form>
  );
}

/** Liste einfügen (US7): Vorschau mit Warnungen, Namen editierbar, Zeilen entfernbar (FR-025, FR-026). */
function PasteList(props: { players: Player[]; onApply: (players: Player[]) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [removed, setRemoved] = useState<number[]>([]);
  // Nachnamen leben nur hier, flüchtig für die Vorschau; gespeichert wird nur der Anzeigename.
  const base = useMemo(() => planImport(props.players, parseRosterList(text)), [props.players, text]);
  const rows: { index: number; row: ImportRow }[] = base
    .map((row, index) => ({ index, row: edits[index] === undefined ? row : { ...row, name: edits[index] } }))
    .filter((r) => !removed.includes(r.index));
  const annotated = annotateRows(
    props.players,
    rows.map((r) => r.row),
  );
  const blocked = annotated.length === 0 || annotated.some((r) => r.warnings.includes('name-leer'));
  return (
    <section class="form card" aria-label="Liste einfügen">
      <h2 class="t-zwischentitel roster__heading">Liste einfügen</h2>
      <div class="field">
        <label class="field__label t-label" for="paste-input">
          EINGEFÜGTE LISTE
        </label>
        <textarea
          id="paste-input"
          class="input textarea"
          data-testid="paste-input"
          rows={5}
          value={text}
          placeholder={'1 Max\n2 Ben\nTom'}
          onInput={(e) => {
            setText(e.currentTarget.value);
            setEdits({});
            setRemoved([]);
          }}
        />
        <p class="field__help">
          Ein Spieler pro Zeile, Nummer davor oder dahinter. Nachnamen werden nicht gespeichert.
        </p>
      </div>
      <div class="field">
        <span class="field__label t-label">VORSCHAU · {annotated.length} SPIELER</span>
        <ul class="paste-preview" data-testid="paste-preview">
          {rows.map(({ index }, i) => {
            const r = annotated[i]!;
            const status = r.matchId === null ? 'neu' : r.revive ? 'wieder sichtbar' : 'aktualisiert';
            return (
              <li key={index} class="paste-row" data-testid={`paste-row-${index}`}>
                <span class="paste-row__number">{r.number ?? '–'}</span>
                <input
                  class="input paste-row__name"
                  data-testid={`paste-name-${index}`}
                  aria-label={`Name aus Zeile ${r.line}`}
                  value={r.name}
                  maxLength={MAX_NAME}
                  onInput={(e) => setEdits({ ...edits, [index]: e.currentTarget.value })}
                />
                <button
                  type="button"
                  class="icon-btn"
                  aria-label={`Zeile ${r.line} entfernen`}
                  data-testid={`paste-remove-${index}`}
                  onClick={() => setRemoved([...removed, index])}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
                <span class="paste-row__tags">
                  <span class="tag">{status}</span>
                  {r.number === null && !r.warnings.includes('nummer-ungueltig') && (
                    <span class="tag">ohne Nummer</span>
                  )}
                  {r.warnings.map((w) => (
                    <span key={w} class="tag tag--warn">
                      {WARNING_TEXT[w]}
                    </span>
                  ))}
                  {looksLikeFullName(r.name) && <span class="tag tag--warn">Bitte nur Vornamen</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div class="button-row">
        <button type="button" class="btn btn--secondary" data-testid="paste-cancel" onClick={props.onCancel}>
          Abbrechen
        </button>
        <button
          type="button"
          class="btn btn--primary"
          data-testid="paste-apply"
          disabled={blocked}
          onClick={() => props.onApply(applyImport(props.players, annotated, newId))}
        >
          {annotated.length} übernehmen
        </button>
      </div>
    </section>
  );
}

type Mode = { kind: 'list' } | { kind: 'form'; player: Player | null } | { kind: 'paste' };

/** Kader (US5, US7): Spieler pflegen, Liste einfügen, Kader teilen. */
export function RosterScreen() {
  const [players, reload] = usePlayers();
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [toDelete, setToDelete] = useState<Player | null>(null);
  const [notice, setNotice] = useState('');
  /** Spec 013 FR-K05: Reihenfolge aus den Einstellungen; bis sie geladen ist, nichts zeigen (kein Umsortieren). */
  const [sort, setSort] = useState<RosterSort | undefined>(undefined);
  useEffect(() => {
    void getSettings().then((s) => setSort(s.rosterSort));
  }, []);

  const save = async (next: Player[]): Promise<void> => {
    await putPlayers(next);
    reload();
    setMode({ kind: 'list' });
  };

  if (players === undefined || sort === undefined) return <main class="page" aria-busy="true" />;
  const visible = visiblePlayers(players, sort);

  return (
    <main class="page">
      <header class="topbar">
        <button type="button" class="icon-btn" aria-label="Zurück" onClick={() => navigate('/')}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 class="topbar__title t-zwischentitel">Kader</h1>
      </header>

      {mode.kind === 'form' && (
        <PlayerForm
          player={mode.player}
          onCancel={() => setMode({ kind: 'list' })}
          onSave={(name, number) =>
            void save(
              mode.player
                ? updatePlayer(players, mode.player.id, { name, number })
                : addPlayer(players, { name, number }, newId()),
            )
          }
        />
      )}
      {mode.kind === 'paste' && (
        <PasteList players={players} onCancel={() => setMode({ kind: 'list' })} onApply={(next) => void save(next)} />
      )}
      {mode.kind === 'list' && (
        <div class="form">
          <div class="roster__actions">
            <button
              type="button"
              class="btn btn--primary"
              data-testid="btn-add-player"
              onClick={() => setMode({ kind: 'form', player: null })}
            >
              Spieler hinzufügen
            </button>
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="btn-paste-list"
              onClick={() => setMode({ kind: 'paste' })}
            >
              Liste einfügen
            </button>
          </div>
          <section class="card card--list" aria-labelledby="roster-title" data-testid="card-roster">
            <h2 id="roster-title" class="t-label card__title">
              {visible.length} SPIELER
            </h2>
            <ul class="roster-list" data-testid="roster-list">
              {visible.map((p) => (
                <li key={p.id} class="roster-row" data-testid={`roster-row-${p.id}`}>
                  <span class="roster-row__number">{p.number ?? ''}</span>
                  <span class="roster-row__name">{p.name}</span>
                  <button
                    type="button"
                    class="btn btn--quiet btn--small"
                    aria-label={`${p.name} ändern`}
                    data-testid={`player-edit-${p.id}`}
                    onClick={() => setMode({ kind: 'form', player: p })}
                  >
                    Ändern
                  </button>
                  <button
                    type="button"
                    class="btn btn--quiet btn--small"
                    aria-label={`${p.name} löschen`}
                    data-testid={`player-delete-${p.id}`}
                    onClick={() => setToDelete(p)}
                  >
                    Löschen
                  </button>
                </li>
              ))}
              {visible.length === 0 && (
                <li class="roster-row roster-row--empty">
                  Noch keine Spieler. Einzeln hinzufügen oder eine Liste einfügen.
                </li>
              )}
            </ul>
          </section>
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="btn-share-roster"
            disabled={visible.length === 0}
            onClick={() =>
              void shareText(rosterShareText(players, sort), 'Kader').then((r) => {
                if (r === 'copied') setNotice('Kader in die Zwischenablage kopiert.');
                if (r === 'failed') setNotice('Teilen hat nicht geklappt.');
              })
            }
          >
            Kader teilen
          </button>
          {notice && (
            <p class="hint" role="status">
              {notice}
            </p>
          )}
        </div>
      )}

      {toDelete && (
        <Confirm
          title={`${toDelete.name} löschen?`}
          text={`${toDelete.name} verschwindet aus Kader und Aufgebot. In alten Spielen bleibt der Name als Torschütze stehen.`}
          yesLabel="Löschen"
          onNo={() => setToDelete(null)}
          onYes={() => {
            const p = toDelete;
            setToDelete(null);
            void save(softDeletePlayer(players, p.id, Date.now()));
          }}
        />
      )}
    </main>
  );
}
