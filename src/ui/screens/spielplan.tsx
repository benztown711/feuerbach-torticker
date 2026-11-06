import { useEffect, useState } from 'preact/hooks';
import {
  checkPlanInput,
  entryDetail,
  entryTitle,
  formatPlanDate,
  isFull,
  nextSaturday,
  planView,
  todayKey,
  type PlanErrors,
  type PlanInput,
} from '../../domain/plan';
import type { LiveSpieltag, PlanEntry, PlanStore, Schema } from '../../domain/types';
import { getSettings } from '../../platform/db';
import { onLiveSettings, onPlanChanged } from '../../platform/live-events';
import { changePlan, loadPlan, refreshPlan, type PlanEdit } from '../../platform/live-setup';
import { Confirm } from '../components/confirm';
import { Sheet } from '../components/sheet';
import { navigate } from '../router';

/** Spec 015 US1: "Mehr" → "Live-Spieltag" → "Spielplan" (Mockup Reiter "Spielplan pflegen"). */

const RETRY_MS = 30_000;

/** Übliche Spielzeiten: WFV-Spieltag, Leistungsliga, Halle. */
const SCHEMAS: Schema[] = [
  { sections: 2, sectionMinutes: 25 },
  { sections: 3, sectionMinutes: 25 },
  { sections: 2, sectionMinutes: 20 },
  { sections: 2, sectionMinutes: 30 },
  { sections: 2, sectionMinutes: 35 },
  { sections: 1, sectionMinutes: 10 },
  { sections: 1, sectionMinutes: 11 },
  { sections: 1, sectionMinutes: 12 },
  { sections: 1, sectionMinutes: 15 },
];
const schemaKey = (s: Schema | null): string => (s ? `${s.sections}x${s.sectionMinutes}` : '');
const schemaLabel = (s: Schema): string => `${s.sections} × ${s.sectionMinutes} Minuten`;

interface Editing {
  id: string | null;
  input: PlanInput;
  cancelled: boolean;
}

const toInput = (e: PlanEntry): PlanInput => ({
  team: e.team,
  date: e.date,
  time: e.time ?? '',
  venue: e.venue,
  opponent: e.opponent,
  competition: e.competition,
  schema: e.schema,
});

function Topbar() {
  return (
    <header class="topbar">
      <button type="button" class="icon-btn" aria-label="Zurück" onClick={() => navigate('/live-spieltag')}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <h1 class="topbar__title t-zwischentitel">Spielplan</h1>
    </header>
  );
}

function Row({ entry, lead, onOpen }: { entry: PlanEntry; lead: string; onOpen?: () => void }) {
  const body = (
    <>
      <span class="plan__time">{lead}</span>
      <span class="plan__text">
        <strong class="plan__title">{entryTitle(entry)}</strong>
        <span class="plan__detail">{entryDetail(entry)}</span>
      </span>
      <span class={`plan__state${entry.cancelled ? ' plan__state--off' : ''}`}>
        {entry.cancelled ? 'abgesagt' : 'frei'}
      </span>
    </>
  );
  return onOpen ? (
    <button
      type="button"
      class={`plan__row${entry.cancelled ? ' plan__row--off' : ''}`}
      data-testid={`plan-row-${entry.id}`}
      onClick={onOpen}
    >
      {body}
    </button>
  ) : (
    <div class={`plan__row${entry.cancelled ? ' plan__row--off' : ''}`} data-testid={`plan-row-${entry.id}`}>
      {body}
    </div>
  );
}

function Group({
  id,
  head,
  count,
  today,
  open,
  onToggle,
  children,
}: {
  id: string;
  head: string;
  count: number;
  today?: boolean;
  open: boolean;
  onToggle: () => void;
  children: preact.ComponentChildren;
}) {
  return (
    <section class="plan__group" data-testid={`plan-group-${id}`}>
      <button type="button" class="plan__head" aria-expanded={open} onClick={onToggle}>
        <span class="plan__date">{head}</span>
        {today && <span class="plan__today">HEUTE</span>}
        <span class="plan__count">{count === 1 ? '1 Spiel' : `${count} Spiele`}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon plan__chev">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && <div class="plan__rows">{children}</div>}
    </section>
  );
}

function EditSheet({
  live,
  editing,
  onChange,
  errors,
  busy,
  onSave,
  onCancelToggle,
  onDelete,
  onClose,
}: {
  live: LiveSpieltag;
  editing: Editing;
  onChange: (input: PlanInput) => void;
  errors: PlanErrors;
  busy: boolean;
  onSave: () => void;
  onCancelToggle: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const v = editing.input;
  const set = (patch: Partial<PlanInput>) => onChange({ ...v, ...patch });
  const extra = v.schema && !SCHEMAS.some((s) => schemaKey(s) === schemaKey(v.schema)) ? [v.schema] : [];
  return (
    <Sheet title={editing.id ? 'Planspiel' : 'Spiel hinzufügen'} testId="plan-sheet" onClose={onClose}>
      <div class="field">
        <span class="field__label t-label" id="plan-team-label">
          MANNSCHAFT
        </span>
        <div class="chips" role="group" aria-labelledby="plan-team-label">
          {live.teams.map((t) => (
            <button
              key={t.key}
              type="button"
              class="chip chip--wide"
              aria-pressed={v.team === t.key}
              data-testid={`plan-team-${t.key}`}
              onClick={() => set({ team: t.key })}
            >
              {t.key}
            </button>
          ))}
        </div>
        {errors.team && <p class="field__error">{errors.team}</p>}
      </div>
      <div class="plan__pair">
        <div class="field">
          <label class="field__label t-label" for="plan-date">
            DATUM
          </label>
          <input
            id="plan-date"
            class="input"
            type="date"
            value={v.date}
            data-testid="plan-date"
            onInput={(e) => set({ date: e.currentTarget.value })}
          />
          {errors.date && <p class="field__error">{errors.date}</p>}
        </div>
        <div class="field">
          <label class="field__label t-label" for="plan-time">
            ANSTOSS
          </label>
          <input
            id="plan-time"
            class="input"
            type="time"
            value={v.time}
            data-testid="plan-time"
            onInput={(e) => set({ time: e.currentTarget.value })}
          />
          {errors.time && <p class="field__error">{errors.time}</p>}
        </div>
      </div>
      <div class="field">
        <label class="field__label t-label" for="plan-opponent">
          GEGNER
        </label>
        <input
          id="plan-opponent"
          class="input"
          maxLength={40}
          value={v.opponent}
          placeholder="leer = Gegner offen"
          data-testid="plan-opponent"
          onInput={(e) => set({ opponent: e.currentTarget.value })}
        />
        {errors.opponent && <p class="field__error">{errors.opponent}</p>}
      </div>
      <div class="field">
        <span class="field__label t-label" id="plan-venue-label">
          WIR SPIELEN
        </span>
        <div class="chips" role="group" aria-labelledby="plan-venue-label">
          <button
            type="button"
            class="chip chip--wide"
            aria-pressed={v.venue === 'home'}
            data-testid="plan-venue-home"
            onClick={() => set({ venue: 'home' })}
          >
            Heim
          </button>
          <button
            type="button"
            class="chip chip--wide"
            aria-pressed={v.venue === 'away'}
            data-testid="plan-venue-away"
            onClick={() => set({ venue: 'away' })}
          >
            Auswärts
          </button>
        </div>
      </div>
      <div class="plan__pair">
        <div class="field">
          <label class="field__label t-label" for="plan-competition">
            WETTBEWERB
          </label>
          <input
            id="plan-competition"
            class="input"
            maxLength={40}
            value={v.competition}
            data-testid="plan-competition"
            onInput={(e) => set({ competition: e.currentTarget.value })}
          />
          {errors.competition && <p class="field__error">{errors.competition}</p>}
        </div>
        <div class="field">
          <label class="field__label t-label" for="plan-schema">
            SPIELZEIT
          </label>
          <select
            id="plan-schema"
            class="select"
            value={schemaKey(v.schema)}
            data-testid="plan-schema"
            onChange={(e) => {
              const key = e.currentTarget.value;
              set({ schema: [...SCHEMAS, ...extra].find((s) => schemaKey(s) === key) ?? null });
            }}
          >
            <option value="">wie Mannschaft</option>
            {[...SCHEMAS, ...extra].map((s) => (
              <option key={schemaKey(s)} value={schemaKey(s)}>
                {schemaLabel(s)}
              </option>
            ))}
          </select>
          {errors.schema && <p class="field__error">{errors.schema}</p>}
        </div>
      </div>
      <button type="button" class="btn btn--primary" disabled={busy} data-testid="plan-save" onClick={onSave}>
        Speichern
      </button>
      {editing.id && (
        <div class="plan__pair">
          <button
            type="button"
            class="btn btn--secondary"
            disabled={busy}
            data-testid="plan-cancel"
            onClick={onCancelToggle}
          >
            {editing.cancelled ? 'Wieder ansetzen' : 'Abgesagt'}
          </button>
          <button type="button" class="btn btn--secondary" disabled={busy} data-testid="plan-delete" onClick={onDelete}>
            Löschen
          </button>
        </div>
      )}
    </Sheet>
  );
}

export function PlanScreen() {
  const [live, setLive] = useState<LiveSpieltag | null | undefined>(undefined);
  const [store, setStore] = useState<PlanStore | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [errors, setErrors] = useState<PlanErrors>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [open, setOpen] = useState<Set<string> | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    void getSettings().then((s) => setLive(s.live));
    return onLiveSettings((s) => setLive(s.live));
  }, []);

  const topic = live?.topic;
  const orgPub = live?.orgPub;
  useEffect(() => {
    if (!live) return;
    let alive = true;
    void loadPlan(live).then((p) => alive && setStore(p));
    const off = onPlanChanged((p) => {
      if (p.topic === live.topic && p.orgPub === live.orgPub) setStore(p);
    });
    // US1-S4: solange die Seite offen ist, hört sie mit (Planspiele anderer Trainer-Handys).
    let watch: { stop(): void } | null = null;
    void import('../../platform/live-watch').then((m) => {
      if (alive) watch = m.watchPlan(live);
    });
    // Nicht gesendete Änderungen nachholen (plan.md, Senden).
    const retry = window.setInterval(() => void refreshPlan(), RETRY_MS);
    return () => {
      alive = false;
      off();
      watch?.stop();
      window.clearInterval(retry);
    };
  }, [topic, orgPub]);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(''), 4000);
    return () => window.clearTimeout(t);
  }, [msg]);

  if (live === undefined) return <main class="page" aria-busy="true" />;

  if (!live?.orgKey) {
    return (
      <main class="page">
        <Topbar />
        <div class="form">
          <section class="card" data-testid="plan-unavailable">
            <p class="live__text">
              Den Spielplan gibt es auf Trainer-Handys mit Trainer-Link. Füge den Trainer-Link unter „Live-Spieltag“
              ein.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const today = todayKey(Date.now());
  const view = store ? planView(store, today) : { upcoming: [], past: [] };
  const expanded = open ?? new Set(view.upcoming[0] ? [view.upcoming[0].date] : []);
  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
  };

  const startAdd = () => {
    setErrors({});
    setEditing({
      id: null,
      cancelled: false,
      input: {
        team: live.teams[0]?.key ?? '',
        date: nextSaturday(today),
        time: '',
        venue: 'home',
        opponent: '',
        competition: '',
        schema: null,
      },
    });
  };

  const run = async (edit: PlanEdit, done: string) => {
    setBusy(true);
    try {
      await changePlan(edit);
      setEditing(null);
      setConfirmDelete(false);
      setMsg(done);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Das hat nicht geklappt.');
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!editing) return;
    const r = checkPlanInput(
      editing.input,
      live.teams.map((t) => t.key),
    );
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    if (!editing.id && store && isFull(store, today)) {
      setMsg('Der Spielplan ist voll (100 Spiele). Lösche zuerst ein Spiel.');
      return;
    }
    void run(
      editing.id ? { kind: 'update', id: editing.id, input: r.value } : { kind: 'add', input: r.value },
      'Gespeichert. Alle Trainer-Handys bekommen es.',
    );
  };

  return (
    <main class="page">
      <Topbar />
      <div class="form plan" data-testid="plan-screen">
        <p class="plan__sub">{live.teams.map((t) => t.key).join(', ')}</p>
        <button type="button" class="btn btn--primary" data-testid="plan-add" onClick={startAdd}>
          Spiel hinzufügen
        </button>
        {store && view.upcoming.length === 0 && view.past.length === 0 && (
          <section class="card" data-testid="plan-empty">
            <p class="live__text">
              Noch keine Spiele im Plan. Trage das erste Spiel ein; alle Trainer-Handys bekommen es automatisch.
            </p>
          </section>
        )}
        {view.upcoming.map((g) => (
          <Group
            key={g.date}
            id={g.date}
            head={formatPlanDate(g.date)}
            count={g.entries.length}
            today={g.date === today}
            open={expanded.has(g.date)}
            onToggle={() => toggle(g.date)}
          >
            {g.entries.map((e) => (
              <Row
                key={e.id}
                entry={e}
                lead={e.time ?? '–'}
                onOpen={() => {
                  setErrors({});
                  setEditing({ id: e.id, input: toInput(e), cancelled: e.cancelled });
                }}
              />
            ))}
          </Group>
        ))}
        {view.past.length > 0 && (
          <Group
            id="past"
            head="Vergangene Spiele"
            count={view.past.length}
            open={expanded.has('past')}
            onToggle={() => toggle('past')}
          >
            {view.past.map((e) => (
              <Row key={e.id} entry={e} lead={formatPlanDate(e.date).slice(0, 6)} />
            ))}
          </Group>
        )}
      </div>
      {editing && (
        <EditSheet
          live={live}
          editing={editing}
          errors={errors}
          busy={busy}
          onChange={(input) => setEditing({ ...editing, input })}
          onSave={save}
          onCancelToggle={() =>
            editing.id &&
            void run(
              { kind: 'cancel', id: editing.id, cancelled: !editing.cancelled },
              editing.cancelled ? 'Wieder angesetzt.' : 'Als abgesagt markiert.',
            )
          }
          onDelete={() => setConfirmDelete(true)}
          onClose={() => setEditing(null)}
        />
      )}
      {confirmDelete && editing?.id && (
        <Confirm
          title="Spiel löschen?"
          text="Es verschwindet bei allen Trainern aus dem Spielplan."
          yesLabel="Löschen"
          onYes={() => editing.id && void run({ kind: 'delete', id: editing.id }, 'Gelöscht.')}
          onNo={() => setConfirmDelete(false)}
        />
      )}
      {msg && (
        <div class="toast plan__toast" role="status" data-testid="plan-msg">
          {msg}
        </div>
      )}
    </main>
  );
}
