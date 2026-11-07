import { useState } from 'preact/hooks';
import type { LiveTeamOption } from '../../domain/live-spieltag';
import { entryDetail, entryTitle, formatPlanDate, todayKey, type PlanInput } from '../../domain/plan';
import { importPlan, missingTeams, parsePlanList, type ListRow } from '../../domain/plan-list';
import type { LiveSpieltag, PlanEntry, PlanStore } from '../../domain/types';

/** Spec 015 US4: "Spielplan" → "Liste einfügen" mit Vorschau (FR-P16 bis FR-P18, Mockup "Liste einfügen"). */

const EXAMPLE = [
  'Sa 14.11. 12:00 E1 heim TSV Musterstadt (Kreisstaffel, 2×25)',
  'So 15.11. 10:00 E2 auswärts SV Beispielhausen (Leistungsliga, 3×25)',
].join('\n');

/** Spec 012 FR-S02: Zwischenablage lesen, direkt im Tipp (iOS verlangt die Berührung); null = nicht lesbar. */
function readClipboard(): Promise<string | null> {
  try {
    const read = navigator.clipboard?.readText?.();
    return read ? read.catch(() => null) : Promise.resolve(null);
  } catch {
    return Promise.resolve(null);
  }
}

const asEntry = (input: PlanInput): PlanEntry => ({
  id: '',
  ...input,
  time: input.time || null,
  cancelled: false,
  deleted: false,
  updatedAt: 0,
});

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header class="topbar">
      <button type="button" class="icon-btn" aria-label="Zurück" onClick={onBack}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <h1 class="topbar__title t-zwischentitel">{title}</h1>
    </header>
  );
}

interface Warning {
  line: number;
  text: string;
  hint: string;
}

export function PlanPaste({
  live,
  store,
  addable,
  busy,
  onApply,
  onAddTeam,
  onClose,
}: {
  live: LiveSpieltag;
  store: PlanStore;
  /** FR-P18: Mannschaften aus "Meine Mannschaften", die noch nicht zum Live-Spieltag gehören. */
  addable: LiveTeamOption[];
  busy: boolean;
  onApply: (inputs: PlanInput[], count: number) => void;
  onAddTeam: (option: LiveTeamOption) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [step, setStep] = useState<'text' | 'preview'>('text');
  const [clipMsg, setClipMsg] = useState('');

  const today = todayKey(Date.now());
  const rows = parsePlanList(
    text,
    today,
    live.teams.map((t) => t.key),
  );
  const ok = rows.filter((r): r is ListRow & { input: PlanInput } => r.problem === null && r.input !== null);
  const inputs = ok.map((r) => r.input);
  let n = 0;
  // Wie es beim Übernehmen ausgeht, auf einer Kopie des Plans (Vorschau-Kennungen werden verworfen).
  const statuses = importPlan(store, inputs, today, Date.now(), () => `v${n++}`).statuses;
  const count = statuses.filter((s) => s === 'neu' || s === 'aktualisiert').length;
  const shown = ok.map((r, i) => ({ row: r, status: statuses[i] })).filter((x) => x.status !== 'voll');
  const warnings: Warning[] = [
    ...rows.filter((r) => r.problem !== null),
    ...ok.filter((_, i) => statuses[i] === 'voll').map((r) => ({ ...r, hint: 'Der Spielplan ist voll (100 Spiele).' })),
  ].sort((a, b) => a.line - b.line);
  const missing = missingTeams(
    rows,
    addable.map((o) => o.key),
  );

  const paste = (): void => {
    setClipMsg('');
    void readClipboard().then((t) => {
      if (t?.trim()) setText(t);
      else setClipMsg('Die Zwischenablage ist leer oder nicht lesbar. Lange ins Feld tippen und „Einsetzen“ wählen.');
    });
  };

  if (step === 'text') {
    return (
      <main class="page">
        <Header title="Liste einfügen" onBack={onClose} />
        <div class="form plan" data-testid="plan-paste-screen">
          <div class="field">
            <label class="field__label t-label" for="plan-paste-input">
              SPIELPLAN, EINE ZEILE JE SPIEL
            </label>
            <textarea
              id="plan-paste-input"
              class="input textarea"
              rows={8}
              data-testid="plan-paste-input"
              placeholder={EXAMPLE}
              value={text}
              onInput={(e) => {
                setText(e.currentTarget.value);
                setClipMsg('');
              }}
            />
            <p class="field__help">
              Tag, Datum, Anstoß, Mannschaft, heim oder auswärts, Gegner, in Klammern Wettbewerb und Spielzeit. „?“
              heißt Gegner offen.
            </p>
            {clipMsg && <p class="field__error">{clipMsg}</p>}
          </div>
          <button type="button" class="btn btn--quiet btn--small" data-testid="plan-paste-clipboard" onClick={paste}>
            Einsetzen
          </button>
          <button
            type="button"
            class="btn btn--primary"
            data-testid="plan-paste-next"
            disabled={rows.length === 0}
            onClick={() => setStep('preview')}
          >
            Weiter
          </button>
        </div>
      </main>
    );
  }

  return (
    <main class="page">
      <Header title="Vorschau" onBack={() => setStep('text')} />
      <div class="form plan" data-testid="plan-preview">
        <p class="plan__sub" data-testid="plan-preview-count">
          {ok.length} von {rows.length} Zeilen erkannt
        </p>
        {shown.length > 0 && (
          <ul class="plan__group plan-paste__rows">
            {shown.map(({ row, status }) => {
              const e = asEntry(row.input);
              return (
                <li key={row.line} class="plan__row plan-paste__row" data-testid={`plan-preview-row-${row.line}`}>
                  <span class="plan-paste__ok" aria-hidden="true">
                    ✓
                  </span>
                  <span class="plan__text">
                    <span>
                      <strong>
                        {formatPlanDate(e.date)}
                        {e.time ? ` ${e.time}` : ''}
                      </strong>{' '}
                      {entryTitle(e)}
                    </span>
                    <span class="plan__detail">{entryDetail(e)}</span>
                  </span>
                  <span class="plan__state">{status}</span>
                </li>
              );
            })}
          </ul>
        )}
        {warnings.map((w) => (
          <p key={w.line} class="plan-pick__hint" data-testid={`plan-preview-warn-${w.line}`}>
            <strong>Zeile {w.line} wird nicht übernommen.</strong> {w.hint}
            <span class="plan-paste__raw">{w.text}</span>
          </p>
        ))}
        {missing.map((key) => (
          <button
            key={key}
            type="button"
            class="btn btn--secondary"
            data-testid={`plan-add-team-${key}`}
            disabled={busy}
            onClick={() => {
              const option = addable.find((o) => o.key === key);
              if (option) onAddTeam(option);
            }}
          >
            {key} zum Live-Spieltag hinzufügen
          </button>
        ))}
        <button
          type="button"
          class="btn btn--primary"
          data-testid="plan-paste-apply"
          disabled={busy || count === 0}
          onClick={() => onApply(inputs, count)}
        >
          {count === 0 ? 'Nichts Neues' : `${count} ${count === 1 ? 'Spiel' : 'Spiele'} übernehmen`}
        </button>
        <button type="button" class="btn btn--secondary" data-testid="plan-paste-back" onClick={() => setStep('text')}>
          Zurück
        </button>
      </div>
    </main>
  );
}
