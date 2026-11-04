import { useEffect, useRef, useState } from 'preact/hooks';
import { HELP_ENTRIES, HELP_TOPICS, type HelpEntry } from '../../domain/help-entries';
import { highlight, MAX_QUERY, searchHelp, snippet, type Segment } from '../../domain/help-search';
import { APP_VERSION } from '../../version';
import { navigate } from '../router';

/**
 * Spec 009: Hilfe mit Suche. `HelpScreen` ist die Hilfe unter "Mehr", `HelpView` wird auch in der
 * Eltern-Ansicht genutzt (nur Einträge für Eltern, FR-H16).
 */

export type HelpMode = 'app' | 'parents';

/**
 * Suchbegriff und Scroll-Position bleiben erhalten, solange die App offen ist (FR-H12).
 * Nur im Arbeitsspeicher: nichts wird gespeichert oder übertragen.
 */
const memory: Record<HelpMode, { query: string; scroll: number; fromList: boolean }> = {
  app: { query: '', scroll: 0, fromList: false },
  parents: { query: '', scroll: 0, fromList: false },
};

const TOPIC_NAME = new Map(HELP_TOPICS.map((t) => [t.id, t.name]));

function Marked({ segs }: { segs: Segment[] }) {
  return <>{segs.map((s, i) => (s.hit ? <mark key={i}>{s.text}</mark> : s.text))}</>;
}

function Chevron() {
  return (
    <svg class="icon help-row__chev" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function Row({
  entry,
  href,
  mode,
  tokens,
}: {
  entry: HelpEntry;
  href: string;
  mode: HelpMode;
  tokens: string[] | null;
}) {
  return (
    <li>
      <a
        class="help-row"
        href={`#${href}`}
        data-testid={`help-row-${entry.id}`}
        onClick={() => {
          memory[mode].fromList = true;
          memory[mode].scroll = window.scrollY;
        }}
      >
        <span class="help-row__text">
          <span class="help-row__title">{tokens ? <Marked segs={highlight(entry.title, tokens)} /> : entry.title}</span>
          {tokens && (
            <span class="help-row__snippet">
              <Marked segs={snippet(entry, tokens)} />
            </span>
          )}
        </span>
        <Chevron />
      </a>
    </li>
  );
}

function Entry({ entry, base, mode, pool }: { entry: HelpEntry; base: string; mode: HelpMode; pool: HelpEntry[] }) {
  const related = (entry.related ?? [])
    .map((id) => pool.find((e) => e.id === id))
    .filter((e): e is HelpEntry => !!e)
    .slice(0, 3);
  return (
    <article class="help-entry" data-testid="help-entry">
      <p class="help-entry__topic t-label">{TOPIC_NAME.get(entry.topic)}</p>
      <h2 class="help-entry__title t-zwischentitel">{entry.title}</h2>
      <p class="help-entry__answer">{entry.answer}</p>
      {entry.steps && (
        <ol class="help-entry__steps">
          {entry.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
      {entry.open && mode === 'app' && (
        <a class="btn btn--secondary help-entry__open" href={`#${entry.open.path}`} data-testid="help-open">
          {entry.open.label} öffnen
        </a>
      )}
      {related.length > 0 && (
        <section class="help-entry__related" data-testid="help-related">
          <h3 class="t-label help-entry__related-title">Siehe auch</h3>
          <ul class="help-list">
            {related.map((r) => (
              <Row key={r.id} entry={r} href={`${base}/${r.id}`} mode={mode} tokens={null} />
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function Results({
  query,
  pool,
  base,
  mode,
  onShowAll,
}: {
  query: string;
  pool: HelpEntry[];
  base: string;
  mode: HelpMode;
  onShowAll: () => void;
}) {
  const result = searchHelp(query, pool);
  if (!result) {
    return (
      <>
        {HELP_TOPICS.map((t) => {
          const entries = pool.filter((e) => e.topic === t.id);
          if (entries.length === 0) return null;
          return (
            <section key={t.id} class="help-group">
              <h2 class="help-topic t-label" data-testid={`help-topic-${t.id}`}>
                {t.name}
              </h2>
              <ul class="help-list">
                {entries.map((e) => (
                  <Row key={e.id} entry={e} href={`${base}/${e.id}`} mode={mode} tokens={null} />
                ))}
              </ul>
            </section>
          );
        })}
      </>
    );
  }
  if (result.entries.length === 0) {
    return (
      <div class="help-none" data-testid="help-none" role="status">
        <h2 class="help-none__title">Nichts gefunden zu „{query.trim()}“</h2>
        <p class="help-none__text">Versuch ein anderes Wort, zum Beispiel „Tor“, „Ton“ oder „teilen“.</p>
        <button type="button" class="btn btn--secondary" data-testid="help-show-all" onClick={onShowAll}>
          Alle Themen anzeigen
        </button>
      </div>
    );
  }
  return (
    <>
      <p class="help-count t-label" data-testid="help-count" role="status">
        {result.entries.length} Treffer
      </p>
      <ul class="help-list">
        {result.entries.map((e) => (
          <Row key={e.id} entry={e} href={`${base}/${e.id}`} mode={mode} tokens={result.tokens} />
        ))}
      </ul>
    </>
  );
}

/**
 * Hilfe-Liste mit Suche oder einzelner Eintrag. `base` ist die Adresse der Liste
 * (`/hilfe` bzw. `/live/<Daten>/hilfe`), `back` der Zurück-Knopf der Liste (Trainer: zu "Mehr").
 */
export function HelpView({
  mode,
  base,
  entryId,
  back,
}: {
  mode: HelpMode;
  base: string;
  entryId: string | null;
  back?: { label: string; path: string };
}) {
  const pool = mode === 'parents' ? HELP_ENTRIES.filter((e) => e.parents) : HELP_ENTRIES;
  const entry = entryId ? pool.find((e) => e.id === entryId) : undefined;
  const mem = memory[mode];
  const [query, setQuery] = useState(mem.query);
  const input = useRef<HTMLInputElement>(null);

  // Wer die Hilfe verlässt (z. B. über die Leiste), kommt beim nächsten Mal oben in der Liste an.
  useEffect(
    () => () => {
      mem.fromList = false;
      mem.scroll = 0;
    },
    [],
  );

  // Beim Öffnen eines Eintrags nach oben, beim Zurückkehren zur Liste die alte Position (FR-H12).
  useEffect(() => {
    if (entry) window.scrollTo(0, 0);
    else {
      window.scrollTo(0, mem.fromList ? mem.scroll : 0);
      mem.fromList = false;
    }
  }, [entry?.id]);

  const change = (q: string): void => {
    const v = q.slice(0, MAX_QUERY);
    mem.query = v;
    mem.scroll = 0;
    setQuery(v);
    window.scrollTo(0, 0);
  };

  if (entry) {
    return (
      <main class="page help">
        <header class="topbar">
          <button
            type="button"
            class="icon-btn"
            aria-label="Zurück zur Hilfe"
            data-testid="help-back"
            onClick={() => {
              if (mem.fromList) window.history.back();
              else navigate(base);
            }}
          >
            <BackIcon />
          </button>
          <h1 class="topbar__title t-zwischentitel">Hilfe</h1>
        </header>
        <Entry entry={entry} base={base} mode={mode} pool={pool} />
      </main>
    );
  }

  return (
    <main class="page help">
      <header class="topbar">
        {back && (
          <button
            type="button"
            class="icon-btn"
            aria-label={back.label}
            data-testid="help-back"
            onClick={() => navigate(back.path)}
          >
            <BackIcon />
          </button>
        )}
        <h1 class={back ? 'topbar__title t-zwischentitel' : 'topbar__title topbar__title--solo t-zwischentitel'}>
          Hilfe
        </h1>
      </header>
      <form
        class="help-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          input.current?.blur();
        }}
      >
        <label class="help-search__box">
          <svg class="icon help-search__icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5L21 21" />
          </svg>
          <input
            ref={input}
            class="help-search__input"
            type="search"
            enterKeyHint="search"
            autocomplete="off"
            maxLength={MAX_QUERY}
            placeholder="Hilfe durchsuchen"
            aria-label="Hilfe durchsuchen"
            data-testid="help-search"
            value={query}
            onInput={(e) => change(e.currentTarget.value)}
          />
          {query && (
            <button
              type="button"
              class="help-search__clear"
              aria-label="Suche leeren"
              data-testid="help-clear"
              onClick={() => {
                change('');
                input.current?.focus();
              }}
            >
              <svg class="icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </label>
      </form>
      <div class="help-results" data-testid="help-results">
        <Results query={query} pool={pool} base={base} mode={mode} onShowAll={() => change('')} />
      </div>
      <p class="help-version" data-testid="help-version">
        Stand: Version {APP_VERSION}
      </p>
    </main>
  );
}

/** `#/hilfe` und `#/hilfe/<id>`: Hilfe unter "Mehr" (FR-H15). */
export function HelpScreen({ entry }: { entry: string | null }) {
  return <HelpView mode="app" base="/hilfe" entryId={entry} back={{ label: 'Zurück zu Mehr', path: '/mehr' }} />;
}
