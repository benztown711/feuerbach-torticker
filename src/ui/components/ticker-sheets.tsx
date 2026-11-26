import { useState } from 'preact/hooks';
import { checkTickerName, MAX_TICKER_NAME, type TickerLine } from '../../domain/live-parent';

/**
 * Spec 024: Blätter, mit denen Eltern das Tickern starten (Name, Bestätigung, Übernehmen, schon getickert). Teil des
 * nachgeladenen Dashboards (Bundle-Budget).
 */

/** FR-E06: "Paul tickert bereits" mit hervorgehobenem Namen. */
export function TickerText({ line }: { line: TickerLine }) {
  return (
    <>
      {line.before}
      <span class="ticker-tag">{line.tag}</span>
      {line.after}
    </>
  );
}

function Dialog({
  testId,
  title,
  children,
}: {
  testId: string;
  title: preact.ComponentChildren;
  children: preact.ComponentChildren;
}) {
  return (
    <div class="overlay overlay--bottom">
      <div class="overlay__backdrop" />
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby={`${testId}-title`} data-testid={testId}>
        <h2 id={`${testId}-title`} class="sheet__title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

/** US1-S2: "Wie heißt du?" (Pflicht, 2 bis 20 Zeichen). */
export function NameSheet({
  initial,
  onDone,
  onCancel,
}: {
  initial: string;
  onDone: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const check = checkTickerName(value);
  const submit = (e: Event): void => {
    e.preventDefault();
    if (check.ok) onDone(check.name);
  };
  return (
    <Dialog testId="ticker-name-sheet" title="Wie heißt du?">
      <p class="sheet__subtitle">Die anderen sehen, dass du tickerst.</p>
      <form class="ticker-form" onSubmit={submit}>
        <label class="field__label t-label" for="ticker-name">
          VORNAME
        </label>
        <input
          id="ticker-name"
          class="input"
          data-testid="ticker-name-input"
          value={value}
          maxLength={MAX_TICKER_NAME}
          autocomplete="given-name"
          placeholder="z. B. Paul"
          onInput={(e) => setValue(e.currentTarget.value)}
          autoFocus
        />
        <p class="field__help">Nur dein Vorname, kein Kindername. Er bleibt auf diesem Handy gespeichert.</p>
        <button type="submit" class="btn btn--primary btn--tall" data-testid="ticker-name-ok" disabled={!check.ok}>
          Weiter
        </button>
      </form>
      <button type="button" class="btn btn--quiet" data-testid="ticker-name-cancel" onClick={onCancel}>
        Abbrechen
      </button>
    </Dialog>
  );
}

/** US1-S3: "Du tickerst E2 gegen TSV Musterstadt als Paul." */
export function ConfirmSheet({
  team,
  opponent,
  name,
  onGo,
  onRename,
  onCancel,
}: {
  team: string;
  opponent: string;
  name: string;
  onGo: () => void;
  onRename: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      testId="ticker-confirm"
      title={
        <>
          Du tickerst {team} gegen {opponent} als <span class="ticker-tag">{name}</span>.
        </>
      }
    >
      <p class="sheet__subtitle">Alle mit dem Link sehen auf der Karte „{name} tickert bereits“.</p>
      <button type="button" class="btn btn--primary btn--tall" data-testid="ticker-go" onClick={onGo}>
        Los geht's
      </button>
      <div class="ticker-row">
        <button type="button" class="btn btn--secondary" data-testid="ticker-rename" onClick={onRename}>
          Name ändern
        </button>
        <button type="button" class="btn btn--quiet" data-testid="ticker-cancel" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </Dialog>
  );
}

/** US2-S3, US2-S8: Rückfrage vor dem Übernehmen. */
export function TakeoverSheet({
  who,
  state,
  staleMinutes,
  me,
  onYes,
  onNo,
}: {
  /** Hervorgehobener Name des bisherigen Tickers ("Paul", "Trainer Jonas"). */
  who: string;
  /** Stand und Minute, z. B. "1:0, 12'". */
  state: string;
  staleMinutes: number | null;
  me: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <Dialog
      testId="ticker-takeover"
      title={
        staleMinutes !== null ? (
          <>
            Von <span class="ticker-tag">{who}</span> kommt seit {staleMinutes} Min nichts. Übernehmen?
          </>
        ) : (
          <>
            <span class="ticker-tag">{who}</span> tickert bereits ({state}). Übernehmen?
          </>
        )
      }
    >
      <p class="sheet__subtitle">
        {who} sieht, dass du übernommen hast. Du tickerst als {me}.
      </p>
      <button type="button" class="btn btn--primary btn--tall" data-testid="ticker-takeover-yes" onClick={onYes}>
        Übernehmen
      </button>
      <button type="button" class="btn btn--quiet" data-testid="ticker-takeover-no" onClick={onNo}>
        Abbrechen
      </button>
    </Dialog>
  );
}

/** US2-S6, US3-S3: Die Mannschaft wird schon getickert. */
export function BusySheet({
  line,
  onWatch,
  onTake,
  onNew,
}: {
  line: TickerLine | null;
  onWatch: () => void;
  onTake: () => void;
  /** Nur bei "Spiel fehlt?": weiteres Spiel derselben Mannschaft (Turniertag). */
  onNew?: () => void;
}) {
  return (
    <Dialog
      testId="ticker-busy"
      title={
        line ? (
          <>
            <span class="ticker-tag">{line.tag}</span> tickert bereits.
          </>
        ) : (
          'Dieses Spiel wird schon getickert.'
        )
      }
    >
      <p class="sheet__subtitle">Meist reicht Zuschauen.</p>
      <button type="button" class="btn btn--primary btn--tall" data-testid="ticker-busy-watch" onClick={onWatch}>
        Zuschauen
      </button>
      <button type="button" class="btn btn--secondary" data-testid="ticker-busy-take" onClick={onTake}>
        Übernehmen
      </button>
      {onNew && (
        <button type="button" class="btn btn--quiet" data-testid="ticker-busy-new" onClick={onNew}>
          Trotzdem neues Spiel
        </button>
      )}
    </Dialog>
  );
}
