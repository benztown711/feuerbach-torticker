import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  addPlayer,
  looksLikeFullName,
  softDeletePlayer,
  sortPlayers,
  updatePlayer,
  validatePlayerName,
  visiblePlayers,
} from '../../domain/roster';
import { MAX_NAME } from '../../domain/roster-names';
import { annotateRows, applyImport, planImport, type ImportRow, type ImportWarning } from '../../domain/roster-merge';
import { parseRosterList } from '../../domain/roster-parse';
import {
  MAX_SQUAD_NAME,
  MAX_SQUADS,
  addSquad,
  hasSquads,
  importTarget,
  inSquad,
  movePlayer,
  movedFrom,
  removeSquad,
  renameSquad,
  squadName,
  squadOfPlayer,
  squadShareText,
  squadsOf,
  teamsWith,
  validateSquadName,
} from '../../domain/squads';
import { shortTeamName } from '../../domain/team-name';
import type { Player, Settings, Squad } from '../../domain/types';
import { validatePlayerNumber } from '../../domain/validation';
import { getSettings } from '../../platform/db';
import { onSquadsChanged } from '../../platform/live-events';
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

/** Spieler anlegen oder ändern (US5-S1); Hinweis "Bitte nur Vornamen" (FR-020); Spec 015 FR-P20: Kader wechseln. */
function PlayerForm(props: {
  player: Player | null;
  squads: Squad[];
  squadId: string;
  onSave: (name: string, number: number | null, squadId: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(props.player?.name ?? '');
  const [number, setNumber] = useState(props.player?.number?.toString() ?? '');
  const [squadId, setSquadId] = useState(props.squadId);
  const nameError = validatePlayerName(name);
  const num = parseNumber(number);
  const ok = nameError === null && num !== 'invalid';
  return (
    <form
      class="form card"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) props.onSave(name, num, squadId);
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
      {hasSquads(props.squads) && (
        <div class="field">
          <label class="field__label t-label" for="player-squad">
            KADER
          </label>
          <select
            id="player-squad"
            class="select"
            data-testid="input-player-squad"
            value={squadId}
            onChange={(e) => setSquadId(e.currentTarget.value)}
          >
            {props.squads.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        </div>
      )}
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

/** Spec 015 FR-P20: Kader hinzufügen oder umbenennen. */
function SquadForm(props: {
  squads: Squad[];
  squad: Squad | null;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(props.squad?.name ?? '');
  const error = validateSquadName(props.squads, name, props.squad?.id);
  return (
    <form
      class="form card"
      data-testid="squad-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (error === null) props.onSave(name);
      }}
    >
      <h2 class="t-zwischentitel roster__heading">{props.squad ? 'Kader umbenennen' : 'Kader hinzufügen'}</h2>
      <div class="field">
        <label class="field__label t-label" for="squad-name">
          NAME DES KADERS
        </label>
        <input
          id="squad-name"
          class="input"
          data-testid="input-squad-name"
          value={name}
          maxLength={MAX_SQUAD_NAME}
          autocomplete="off"
          placeholder="z. B. E3"
          onInput={(e) => setName(e.currentTarget.value)}
        />
        {name.trim() !== '' && error !== null ? (
          <p class="field__error">{error}</p>
        ) : (
          !props.squad &&
          !hasSquads(props.squads) && (
            <p class="field__help">
              Der bisherige Kader heißt „{props.squads[0]!.name}“. Du kannst ihn danach umbenennen, z. B. in „E1/E2“.
            </p>
          )
        )}
      </div>
      <div class="button-row">
        <button type="button" class="btn btn--secondary" onClick={props.onCancel}>
          Abbrechen
        </button>
        <button type="submit" class="btn btn--primary" data-testid="btn-save-squad" disabled={error !== null}>
          Speichern
        </button>
      </div>
    </form>
  );
}

/** Liste einfügen (US7): Vorschau mit Warnungen, Namen editierbar, Zeilen entfernbar (FR-025, FR-026). */
function PasteList(props: {
  players: Player[];
  squads: Squad[];
  shownId: string;
  onApply: (players: Player[], squads: Squad[] | null, shownId: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  // Spec 015 FR-P23: Zielkader aus der ersten Zeile ("Kader E3:"), sonst der angezeigte; fehlt er, wird er angelegt.
  const [newSquadId] = useState(newId);
  const target = importTarget(props.squads, props.shownId, text, () => newSquadId);
  const multi = hasSquads(target.squads);
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
      {multi && (
        <p class="hint" data-testid="paste-target">
          {target.full
            ? `Höchstens ${MAX_SQUADS} Kader: Die Liste geht in „${target.name}“.`
            : `Ziel: Kader „${target.name}“${target.created ? ' (wird angelegt)' : ''}`}
        </p>
      )}
      <div class="field">
        <span class="field__label t-label">VORSCHAU · {annotated.length} SPIELER</span>
        <ul class="paste-preview" data-testid="paste-preview">
          {rows.map(({ index }, i) => {
            const r = annotated[i]!;
            const status = r.matchId === null ? 'neu' : r.revive ? 'wieder sichtbar' : 'aktualisiert';
            const from = movedFrom(target.squads, props.players, r.matchId, target.squadId);
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
                  {from !== null && <span class="tag">aus „{from}“</span>}
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
          onClick={() =>
            props.onApply(
              applyImport(props.players, annotated, newId, multi ? target.squadId : undefined),
              target.created ? target.squads : null,
              target.squadId,
            )
          }
        >
          {annotated.length} übernehmen
        </button>
      </div>
    </section>
  );
}

type Mode =
  | { kind: 'list' }
  | { kind: 'form'; player: Player | null }
  | { kind: 'paste' }
  | { kind: 'squad'; squad: Squad | null };

/** Spec 016: Kader-Abgleich, nachgeladen. */
const sync = () => import('../../platform/squad-sync');

/** Kader (US5, US7): Spieler pflegen, Liste einfügen, Kader teilen; Spec 015 US5: mehrere benannte Kader. */
export function RosterScreen() {
  const [players, reload] = usePlayers();
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [toDelete, setToDelete] = useState<Player | null>(null);
  const [squadToDelete, setSquadToDelete] = useState<Squad | null>(null);
  /** Spec 016 FR-B01: Rückfrage vor "nicht mehr teilen". */
  const [toUnshare, setToUnshare] = useState<Squad | null>(null);
  /** Spec 016 FR-B01: Trainer-Handy mit gültigem Live-Spieltag (geprüft im nachgeladenen Abgleich). */
  const [trainer, setTrainer] = useState(false);
  const [notice, setNotice] = useState('');
  /** Spec 013 FR-K05: Reihenfolge aus den Einstellungen; bis sie geladen ist, nichts zeigen (kein Umsortieren). */
  const [settings, setSettings] = useState<Settings | undefined>(undefined);
  /** Angezeigter Kader (Spec 015 US5). */
  const [shown, setShown] = useState('');
  useEffect(() => {
    void getSettings().then(setSettings);
    // Spec 016: geteilte Kader von anderen Trainer-Handys sofort zeigen.
    return onSquadsChanged(() => {
      reload();
      void getSettings().then(setSettings);
    });
  }, []);
  useEffect(() => {
    if (!settings?.live?.orgKey) return setTrainer(false);
    let alive = true;
    void sync().then((m) => alive && setTrainer(m.isTrainer(settings)));
    return () => {
      alive = false;
    };
  }, [settings]);

  /** Spec 016 R-B5: über den Kader-Abgleich speichern (Änderungen geteilter Kader gehen hinaus). */
  const save = async (next: Player[]): Promise<void> => {
    await (await sync()).savePlayers(next);
    reload();
    setMode({ kind: 'list' });
  };
  /** Frisch gelesen, damit eine Änderung an anderer Stelle nicht verloren geht. */
  const saveSquads = async (squads: Squad[]): Promise<void> => {
    setSettings(await (await sync()).saveSettings({ ...(await getSettings()), squads }));
  };

  if (players === undefined || settings === undefined) return <main class="page" aria-busy="true" />;
  const sort = settings.rosterSort;
  const squads = squadsOf(settings);
  const multi = hasSquads(squads);
  const shownId = squads.some((q) => q.id === shown) ? shown : squads[0]!.id;
  const shownName = squadName(squads, shownId);
  const visible = multi ? sortPlayers(inSquad(squads, players, shownId), sort) : visiblePlayers(players, sort);
  const playing = teamsWith(squads, settings.teams, shownId).map((t) => shortTeamName(t.name));
  const shownSquad = squads.find((q) => q.id === shownId)!;
  const full = trainer && settings.squadSync?.topic === settings.live?.topic ? (settings.squadSync?.full ?? []) : [];

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
          squads={squads}
          squadId={mode.player ? squadOfPlayer(squads, mode.player) : shownId}
          onCancel={() => setMode({ kind: 'list' })}
          onSave={(name, number, squadId) => {
            const id = mode.player?.id ?? newId();
            const next = mode.player
              ? updatePlayer(players, id, { name, number })
              : addPlayer(players, { name, number }, id);
            void save(multi ? movePlayer(next, id, squadId) : next);
          }}
        />
      )}
      {mode.kind === 'squad' && (
        <SquadForm
          squads={squads}
          squad={mode.squad}
          onCancel={() => setMode({ kind: 'list' })}
          onSave={(name) => {
            const id = mode.squad?.id ?? newId();
            const next = mode.squad ? renameSquad(squads, id, name) : addSquad(squads, name, id);
            if (!next) return;
            setShown(id);
            setMode({ kind: 'list' });
            void saveSquads(next);
          }}
        />
      )}
      {mode.kind === 'paste' && (
        <PasteList
          players={players}
          squads={squads}
          shownId={shownId}
          onCancel={() => setMode({ kind: 'list' })}
          onApply={(next, nextSquads, target) => {
            setShown(target);
            void (nextSquads ? saveSquads(nextSquads) : Promise.resolve()).then(() => save(next));
          }}
        />
      )}
      {mode.kind === 'list' && (
        <div class="form">
          {multi && (
            <div
              class="segmented segmented--squads"
              role="group"
              aria-label="Kader"
              data-testid="roster-squads"
              style={{ gridTemplateColumns: `repeat(${Math.min(squads.length, 3)}, minmax(0, 1fr))` }}
            >
              {squads.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  class="segmented__item"
                  aria-pressed={q.id === shownId}
                  data-testid={`roster-squad-${q.id}`}
                  onClick={() => {
                    setShown(q.id);
                    setNotice('');
                  }}
                >
                  {q.name} · {inSquad(squads, players, q.id).length}
                </button>
              ))}
            </div>
          )}
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
          {trainer && (
            <div class="switch-row roster__share card" data-testid="roster-share">
              <div class="switch-row__text">
                <span class="switch-row__title" id="roster-share-title">
                  Mit Trainern geteilt
                </span>
                <p class="switch-row__help">
                  {shownSquad.shared
                    ? 'Alle Trainer-Handys haben diesen Kader und seine Änderungen.'
                    : 'Nur auf diesem Handy.'}
                </p>
              </div>
              <button
                type="button"
                class="switch"
                role="switch"
                aria-checked={shownSquad.shared === true}
                aria-labelledby="roster-share-title"
                data-testid="roster-share-switch"
                onClick={() =>
                  shownSquad.shared
                    ? setToUnshare(shownSquad)
                    : void saveSquads(squads.map((q) => (q.id === shownId ? { ...q, shared: true } : q)))
                }
              />
            </div>
          )}
          {full.map((name) => (
            <p key={name} class="hint" data-testid="roster-full">
              „{name}“ ist geteilt, hat aber keinen Platz (höchstens {MAX_SQUADS} Kader).
            </p>
          ))}
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
                  {multi
                    ? `Noch keine Spieler in „${shownName}“. Einzeln hinzufügen, eine Liste einfügen oder beim Spieler den Kader wechseln.`
                    : 'Noch keine Spieler. Einzeln hinzufügen oder eine Liste einfügen.'}
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
              void shareText(squadShareText(players, squads, shownId, sort), 'Kader').then((r) => {
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
          {multi && settings.teams.length > 0 && (
            <p class="field__help" data-testid="roster-squad-teams">
              {playing.length > 0
                ? `Spielt mit diesem Kader: ${playing.join(', ')}`
                : 'Noch keine Mannschaft spielt mit diesem Kader. Auswahl unter „Einstellungen“ → „Meine Mannschaften“.'}
            </p>
          )}
          <section class="card roster__squads" aria-label="Kader verwalten">
            {multi && (
              <div class="roster__actions">
                <button
                  type="button"
                  class="btn btn--quiet btn--small"
                  data-testid="btn-rename-squad"
                  onClick={() => setMode({ kind: 'squad', squad: squads.find((q) => q.id === shownId)! })}
                >
                  Kader umbenennen
                </button>
                <button
                  type="button"
                  class="btn btn--quiet btn--small"
                  data-testid="btn-delete-squad"
                  disabled={visible.length > 0}
                  onClick={() => setSquadToDelete(squads.find((q) => q.id === shownId)!)}
                >
                  Kader löschen
                </button>
              </div>
            )}
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="btn-add-squad"
              disabled={squads.length >= MAX_SQUADS}
              onClick={() => setMode({ kind: 'squad', squad: null })}
            >
              Kader hinzufügen
            </button>
            <p class="field__help">
              {squads.length >= MAX_SQUADS
                ? `Höchstens ${MAX_SQUADS} Kader.`
                : multi
                  ? 'Löschen geht nur, wenn der Kader leer ist.'
                  : 'Zum Beispiel „E3“, wenn eine Mannschaft mit eigenen Kindern spielt.'}
            </p>
          </section>
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
      {toUnshare && (
        <Confirm
          title="Kader nicht mehr teilen?"
          text={`Auf den anderen Handys bleibt „${toUnshare.name}“ als eigener Kader, wird aber nicht mehr abgeglichen.`}
          yesLabel="Nicht mehr teilen"
          onNo={() => setToUnshare(null)}
          onYes={() => {
            const id = toUnshare.id;
            setToUnshare(null);
            void saveSquads(squads.map((q) => (q.id === id ? { ...q, shared: false } : q)));
          }}
        />
      )}
      {squadToDelete && (
        <Confirm
          title={`Kader „${squadToDelete.name}“ löschen?`}
          text={`Mannschaften mit diesem Kader spielen danach mit „${
            squads.find((q) => q.id !== squadToDelete.id)!.name
          }“.`}
          yesLabel="Löschen"
          onNo={() => setSquadToDelete(null)}
          onYes={() => {
            const next = removeSquad(squads, players, squadToDelete.id);
            setSquadToDelete(null);
            if (next) void saveSquads(next);
          }}
        />
      )}
    </main>
  );
}
