import { useEffect, useMemo, useState } from 'preact/hooks';
import { allowedTeams } from '../../domain/live-parent';
import { parseLinkPath } from '../../domain/live-link';
import { shortTeamName } from '../../domain/team-name';
import type { BoardEntry } from '../../domain/live-board';
import type { Schema, Venue } from '../../domain/types';
import { newReceiver, type ReceiverState } from '../../platform/live-receiver';
import { busyWith, canTick, saveTickerName, startGame, takeOver, tickerName } from '../../platform/parent-ticker';
import { BusySheet, NameSheet } from '../components/ticker-sheets';
import { tickerLine } from '../../domain/live-parent';
import { navigate } from '../router';

/**
 * Spec 024 US3: "Neues Spiel" in der Eltern-Fassung (Nachholspiel ohne Spielplan). Nur Mannschaften, für die Eltern
 * tickern dürfen; ohne Spielplan und ohne "Live aufs Dashboard" (immer live).
 */

const SCHEMAS: Schema[] = [
  { sections: 2, sectionMinutes: 20 },
  { sections: 2, sectionMinutes: 25 },
  { sections: 2, sectionMinutes: 30 },
  { sections: 3, sectionMinutes: 15 },
];
const label = (s: Schema): string => `${s.sections} × ${s.sectionMinutes}`;

export function ParentNewScreen({ data }: { data: string }) {
  const link = useMemo(() => parseLinkPath(`/live/${data}`), [data]);
  const back = `/live/${data}`;
  const view = link.kind === 'view' ? link.view : null;
  const receiver = useMemo(() => (view ? newReceiver(view) : null), [data]);
  const [state, setState] = useState<ReceiverState | null>(() => receiver?.get() ?? null);
  useEffect(() => {
    if (!receiver) return;
    const off = receiver.onChange(() => setState(receiver.get()));
    receiver.start();
    return () => {
      off();
      receiver.stop();
    };
  }, [receiver]);
  const [name, setName] = useState<string | null>(null);
  useEffect(() => void tickerName().then(setName), []);
  const board = state?.board;
  const teams = board ? allowedTeams(board.config).filter((t) => canTick(board, t)) : [];
  const [team, setTeam] = useState<string | null>(null);
  const chosen = team ?? (teams.length === 1 ? teams[0]! : null);
  const [opponent, setOpponent] = useState('');
  const [venue, setVenue] = useState<Venue>('home');
  const [schema, setSchema] = useState<Schema>(SCHEMAS[1]!);
  const [late, setLate] = useState(false);
  const [busy, setBusy] = useState<BoardEntry | null>(null);
  const [error, setError] = useState('');

  if (!view || !receiver || !state || !board) {
    return (
      <main class="page" data-testid="parent-new-invalid">
        <p class="hint">Dieser Link ist nicht gültig. Bitte den ganzen Link aus der Elterngruppe öffnen.</p>
      </main>
    );
  }
  const detail = (key: string) => (board.config?.m ?? []).find(([k]) => k === key);
  const ready = chosen !== null && opponent.trim() !== '';
  const go = (id: string): void => navigate(`${back}/spiel/${id}${late ? '/einstieg' : ''}`);
  const fail = (e: unknown): void => setError(e instanceof Error ? e.message : 'Das hat nicht geklappt.');
  const create = (): void => {
    if (!chosen) return;
    void startGame(view, board, { team: chosen, opponent, venue, schema }).then(go, fail);
  };
  const submit = async (): Promise<void> => {
    if (!ready || !chosen) return;
    setError('');
    const running = await busyWith(board, chosen, receiver.serverNow());
    if (running) setBusy(running);
    else create();
  };

  return (
    <main class="page" data-testid="parent-new">
      <header class="topbar">
        <button type="button" class="icon-btn" aria-label="Zurück zu Live" onClick={() => navigate(back)}>
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
          void submit();
        }}
      >
        <section class="card" aria-labelledby="pn-team">
          <h2 id="pn-team" class="t-label card__title">
            MANNSCHAFT
          </h2>
          <div class="chips" role="group" aria-labelledby="pn-team">
            {teams.map((t) => (
              <button
                type="button"
                key={t}
                class="chip chip--wide"
                aria-pressed={t === chosen}
                data-testid={`parent-team-${t}`}
                onClick={() => setTeam(t)}
              >
                {shortTeamName(detail(t)?.[1] ?? t)}
              </button>
            ))}
          </div>
          <p class="field__help">Nur Mannschaften, für die Eltern tickern dürfen.</p>
        </section>
        <section class="card" aria-labelledby="pn-match">
          <h2 id="pn-match" class="t-label card__title">
            BEGEGNUNG
          </h2>
          <div class="field">
            <label class="field__label t-label" for="pn-opponent">
              GEGNER
            </label>
            <input
              id="pn-opponent"
              class="input"
              data-testid="parent-opponent"
              value={opponent}
              maxLength={40}
              autocomplete="off"
              placeholder="z. B. SV Beispielstadt"
              onInput={(e) => setOpponent(e.currentTarget.value)}
            />
          </div>
          <div class="chips" role="group" aria-label="Heim oder Gast">
            {(['home', 'away'] as Venue[]).map((v) => (
              <button
                type="button"
                key={v}
                class="chip chip--wide"
                aria-pressed={venue === v}
                data-testid={`parent-venue-${v}`}
                onClick={() => setVenue(v)}
              >
                {v === 'home' ? 'Wir sind Heim' : 'Wir sind Gast'}
              </button>
            ))}
          </div>
          <p class="field__help">Trikots kannst du im Spiel über „…“ → „Trikots ändern“ anpassen.</p>
        </section>
        <section class="card" aria-labelledby="pn-time">
          <h2 id="pn-time" class="t-label card__title">
            SPIELZEIT
          </h2>
          <div class="chips" role="group" aria-labelledby="pn-time">
            {SCHEMAS.map((sc) => (
              <button
                type="button"
                key={label(sc)}
                class="chip"
                aria-pressed={label(sc) === label(schema)}
                data-testid={`parent-schema-${sc.sections}x${sc.sectionMinutes}`}
                onClick={() => setSchema(sc)}
              >
                {label(sc)}
              </button>
            ))}
          </div>
          <div class="switch-row">
            <div class="switch-row__text">
              <span class="switch-row__title" id="pn-late">
                Spiel läuft schon
              </span>
              <p class="switch-row__help">Abschnitt, Restzeit und Spielstand gleich danach einstellen.</p>
            </div>
            <button
              type="button"
              class="switch"
              role="switch"
              aria-checked={late}
              aria-labelledby="pn-late"
              data-testid="parent-late"
              onClick={() => setLate(!late)}
            />
          </div>
        </section>
        <div class="form__bar">
          {error && (
            <p class="field__error" role="status">
              {error}
            </p>
          )}
          <p class="field__help">Das Spiel geht live aufs Dashboard{name ? `, als ${name}` : ''}.</p>
          <button type="submit" class="btn btn--primary btn--large" data-testid="parent-go" disabled={!ready}>
            Weiter zum Anpfiff
          </button>
        </div>
      </form>
      {name === '' && (
        <NameSheet
          initial=""
          onCancel={() => navigate(back)}
          onDone={(n) => void saveTickerName(n).then(setName, fail)}
        />
      )}
      {busy && (
        <BusySheet
          line={tickerLine({ name: busy.snap.by ?? null, trainer: busy.snap.tr === 1 }, { own: false, ended: false })}
          onWatch={() => navigate(back)}
          onTake={() =>
            void takeOver(view, board, busy, state.skew).then((id) => navigate(`${back}/spiel/${id}`), fail)
          }
          onNew={() => {
            setBusy(null);
            create();
          }}
        />
      )}
    </main>
  );
}
