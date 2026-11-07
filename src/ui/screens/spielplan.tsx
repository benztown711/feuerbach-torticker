import { useEffect, useState } from 'preact/hooks';
import { addableTeams } from '../../domain/live-manage';
import type { LiveTeamOption } from '../../domain/live-spieltag';
import {
  activeClaim,
  checkPlanInput,
  entryDetail,
  entryState,
  entryTitle,
  formatPlanDate,
  formatPlanDateLong,
  formatPlanDateShort,
  isFull,
  isPlanDate,
  matchText,
  MAX_TRAINER_NAME,
  entryWhen,
  nextSaturday,
  planView,
  todayKey,
  type PlanErrors,
  type PlanInput,
} from '../../domain/plan';
import { planListText } from '../../domain/plan-list';
import type { LiveSpieltag, PlanEntry, PlanStore, Schema, Settings, Team } from '../../domain/types';
import { getSettings } from '../../platform/db';
import { onLiveSettings, onPlanChanged } from '../../platform/live-events';
import { addTeamToLive, changePlan, loadPlan, refreshPlan, type PlanEdit } from '../../platform/live-setup';
import { shareText } from '../../platform/share';
import { Confirm } from '../components/confirm';
import { Sheet } from '../components/sheet';
import { navigate } from '../router';
import { PlanPaste } from './plan-paste';

/** Spec 015 US1, US4: "Mehr" → "Live-Spieltag" → "Spielplan" (Mockup Reiter "Spielplan pflegen", "Liste einfügen"). */

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

/** Pflichtfeld-Stern (Legende unten im Blatt). */
const Req = () => (
  <span class="plan__req" aria-label="Pflichtfeld">
    *
  </span>
);

/**
 * Datum bzw. Uhrzeit immer deutsch angezeigt ("Sa 14.11.2026", "12:00"), unabhängig von der Sprache des Browsers;
 * darüber liegt unsichtbar das native Feld, das beim Tippen die Auswahl des Handys öffnet.
 */
function Picker({
  id,
  type,
  value,
  shown,
  onInput,
}: {
  id: string;
  type: 'date' | 'time';
  value: string;
  shown: string;
  onInput: (value: string) => void;
}) {
  return (
    <div class="picker">
      <span class="input picker__shown" aria-hidden="true" data-testid={`${id}-shown`}>
        {shown}
      </span>
      <input
        id={id}
        class="picker__native"
        type={type}
        lang="de"
        value={value}
        data-testid={id}
        onInput={(e) => onInput(e.currentTarget.value)}
        onClick={(e) => {
          // Am Computer öffnet ein Klick sonst nur ein Teilfeld; auf dem Handy öffnet sich die Auswahl ohnehin.
          try {
            e.currentTarget.showPicker();
          } catch {
            // nicht unterstützt oder nicht erlaubt
          }
        }}
      />
    </div>
  );
}

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

function Row({
  entry,
  lead,
  today,
  me,
  onOpen,
}: {
  entry: PlanEntry;
  lead: string;
  today: string;
  me: string;
  onOpen: () => void;
}) {
  // FR-P01: "frei", "abgesagt", "angelegt", US6 "Tickert: …"; vergangene ohne Zustand.
  const state = entryState(entry, today, me);
  const body = (
    <>
      <span class="plan__time">{lead}</span>
      <span class="plan__text">
        <strong class="plan__title">{entryTitle(entry)}</strong>
        <span class="plan__detail">{entryDetail(entry)}</span>
      </span>
      {state ? <span class={`plan__state${entry.cancelled ? ' plan__state--off' : ''}`}>{state}</span> : <span />}
    </>
  );
  return (
    <button
      type="button"
      class={`plan__row${entry.cancelled ? ' plan__row--off' : ''}`}
      data-testid={`plan-row-${entry.id}`}
      onClick={onOpen}
    >
      {body}
    </button>
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

/** US6: Rückfrage vor dem Vormerken bzw. Übernehmen, beim ersten Mal mit dem Vornamen (FR-P26). */
function ClaimDialog({
  title,
  text,
  yesLabel,
  askName,
  onYes,
  onNo,
}: {
  title: string;
  text: string;
  yesLabel: string;
  askName: boolean;
  onYes: (name: string) => void;
  onNo: () => void;
}) {
  const [name, setName] = useState('');
  return (
    <div class="overlay overlay--center">
      <div class="overlay__backdrop" onClick={onNo} />
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-title"
        data-testid="claim-dialog"
        onKeyDown={(e) => e.key === 'Escape' && onNo()}
      >
        <h2 id="claim-title" class="dialog__title">
          {title}
        </h2>
        <p class="dialog__text">{text}</p>
        {askName && (
          <div class="field">
            <label class="field__label t-label" for="claim-name">
              DEIN NAME FÜR DIE TRAINER (OPTIONAL)
            </label>
            <input
              id="claim-name"
              class="input"
              maxLength={MAX_TRAINER_NAME}
              placeholder="Vorname"
              autocomplete="given-name"
              value={name}
              data-testid="claim-name"
              onInput={(e) => setName(e.currentTarget.value)}
            />
            <p class="field__help">Fragt die App nur beim ersten Mal. Ändern in den Einstellungen.</p>
          </div>
        )}
        <div class="button-row">
          <button type="button" class="btn btn--secondary" data-testid="claim-no" onClick={onNo}>
            Abbrechen
          </button>
          <button type="button" class="btn btn--primary" data-testid="claim-yes" onClick={() => onYes(name)}>
            {yesLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** US6: wer tickert, mit "Ich tickere" bzw. "Nicht mehr tickern" (Mockup "Vormerken"). */
function ClaimBox({
  entry,
  me,
  busy,
  onClaim,
  onRelease,
}: {
  entry: PlanEntry;
  me: string;
  busy: boolean;
  onClaim: () => void;
  onRelease: () => void;
}) {
  const c = activeClaim(entry);
  const mine = c?.by === me;
  const text = !c
    ? 'Noch niemand tickert dieses Spiel.'
    : mine
      ? 'Du tickerst dieses Spiel.'
      : `Tickert: ${c.name || 'vergeben'}`;
  return (
    <section class="plan__claim" data-testid="plan-claim-box">
      <p class="plan__claim-text" data-testid="plan-claim-state">
        {text}
      </p>
      {mine ? (
        <button type="button" class="btn btn--secondary" disabled={busy} data-testid="plan-unclaim" onClick={onRelease}>
          Nicht mehr tickern
        </button>
      ) : (
        <button type="button" class="btn btn--primary" disabled={busy} data-testid="plan-claim" onClick={onClaim}>
          Ich tickere
        </button>
      )}
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
  claim,
}: {
  live: LiveSpieltag;
  editing: Editing;
  /** US6: Block "Ich tickere" (nur kommende, nicht abgesagte, noch nicht angelegte Planspiele). */
  claim?: preact.ComponentChildren;
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
    <Sheet title={editing.id ? 'Spiel bearbeiten' : 'Spiel hinzufügen'} testId="plan-sheet" onClose={onClose}>
      {claim}
      <div class="field">
        <span class="field__label t-label" id="plan-team-label">
          MANNSCHAFT <Req />
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
            DATUM <Req />
          </label>
          <Picker
            id="plan-date"
            type="date"
            value={v.date}
            shown={isPlanDate(v.date) ? formatPlanDateLong(v.date) : 'Datum wählen'}
            onInput={(date) => set({ date })}
          />
          {errors.date && <p class="field__error">{errors.date}</p>}
        </div>
        <div class="field">
          <label class="field__label t-label" for="plan-time">
            ANSTOSS
          </label>
          <Picker
            id="plan-time"
            type="time"
            value={v.time}
            shown={v.time ? v.time : 'offen'}
            onInput={(time) => set({ time })}
          />
          {v.time && (
            <button type="button" class="link-btn" data-testid="plan-time-clear" onClick={() => set({ time: '' })}>
              Anstoß offen
            </button>
          )}
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
          WIR SPIELEN <Req />
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
            placeholder="z. B. Kreisstaffel"
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
      <p class="field__help" data-testid="plan-required">
        <Req /> Pflichtfeld. Anstoß, Gegner, Wettbewerb und Spielzeit dürfen offen bleiben.
      </p>
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
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  /** US6: Kennung dieses Handys und Vorname (fehlt = noch nie gefragt). */
  const [me, setMe] = useState<{ id: string; name: string | undefined }>({ id: '', name: undefined });
  const [claimAsk, setClaimAsk] = useState<'claim' | 'take' | null>(null);
  const [pasting, setPasting] = useState(false);
  const [store, setStore] = useState<PlanStore | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [errors, setErrors] = useState<PlanErrors>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [open, setOpen] = useState<Set<string> | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const apply = (s: Settings): void => {
      setLive(s.live);
      setMyTeams(s.teams);
      setMe({ id: s.deviceId ?? '', name: s.trainerName });
    };
    void getSettings().then(apply);
    return onLiveSettings(apply);
  }, []);

  const topic = live?.topic;
  const orgPub = live?.orgPub;
  const canEdit = !!live?.orgKey;
  useEffect(() => {
    if (!live?.orgKey) return;
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
  }, [topic, orgPub, canEdit]);

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

  const openEntry = (e: PlanEntry) => {
    setErrors({});
    setEditing({ id: e.id, input: toInput(e), cancelled: e.cancelled });
  };

  const attempt = async (task: () => Promise<unknown>, done: string): Promise<boolean> => {
    setBusy(true);
    try {
      await task();
      setMsg(done);
      return true;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Das hat nicht geklappt.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const run = async (edit: PlanEdit, done: string) => {
    if (await attempt(() => changePlan(edit), done)) {
      setEditing(null);
      setConfirmDelete(false);
      setClaimAsk(null);
    }
  };

  // US6: Vormerken nach Rückfrage; Kennung und Name kommen danach aus den Einstellungen.
  const claim = async (name: string) => {
    if (!editing?.id) return;
    const ask = me.name === undefined;
    await run(
      { kind: 'claim', id: editing.id, claim: true, ...(ask ? { name } : {}) },
      'Vorgemerkt. Die anderen Trainer sehen es.',
    );
    const s = await getSettings();
    setMe({ id: s.deviceId ?? '', name: s.trainerName });
  };

  // US4-S5, FR-P19: alle Spiele ab heute im Einfügeformat teilen.
  const listText = store ? planListText(store, today) : '';
  const share = () =>
    void shareText(listText, 'Spielplan').then((r) => {
      if (r === 'copied') setMsg('Spielplan in die Zwischenablage kopiert.');
      if (r === 'failed') setMsg('Teilen hat nicht geklappt.');
    });

  // US4: Liste übernehmen; FR-P18: fehlende Mannschaft aus "Meine Mannschaften" dazunehmen.
  const applyList = (inputs: PlanInput[], count: number) =>
    void attempt(
      () => changePlan({ kind: 'import', inputs }),
      count === 1
        ? '1 Spiel übernommen. Alle Trainer-Handys bekommen es.'
        : `${count} Spiele übernommen. Alle Trainer-Handys bekommen sie.`,
    ).then((ok) => ok && setPasting(false));
  const addTeam = (o: LiveTeamOption) =>
    void attempt(() => addTeamToLive(o), `${o.key} gehört jetzt zum Live-Spieltag. Die Links bleiben gleich.`);

  const current = editing?.id ? store?.entries.find((e) => e.id === editing.id && !e.deleted) : undefined;
  const claimable = current && !current.cancelled && !current.gameId && current.date >= today;
  const holder = current ? activeClaim(current) : null;
  const holderName = holder?.name || 'Ein anderer Trainer';

  const toast = msg && (
    <div class="toast plan__toast" role="status" data-testid="plan-msg">
      {msg}
    </div>
  );

  if (pasting && store) {
    return (
      <>
        <PlanPaste
          live={live}
          store={store}
          addable={addableTeams(live, myTeams)}
          busy={busy}
          onApply={applyList}
          onAddTeam={addTeam}
          onClose={() => setPasting(false)}
        />
        {toast}
      </>
    );
  }

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
        <div class="plan__pair">
          <button
            type="button"
            class="btn btn--quiet btn--small"
            data-testid="plan-paste"
            disabled={!store}
            onClick={() => setPasting(true)}
          >
            Liste einfügen
          </button>
          <button
            type="button"
            class="btn btn--quiet btn--small"
            data-testid="plan-share"
            disabled={!listText}
            onClick={share}
          >
            Spielplan teilen
          </button>
        </div>
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
              <Row key={e.id} entry={e} lead={e.time ?? '–'} today={today} me={me.id} onOpen={() => openEntry(e)} />
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
              <Row
                key={e.id}
                entry={e}
                lead={formatPlanDateShort(e.date)}
                today={today}
                me={me.id}
                onOpen={() => openEntry(e)}
              />
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
          claim={
            claimable && (
              <ClaimBox
                entry={current}
                me={me.id}
                busy={busy}
                onClaim={() => setClaimAsk(holder && holder.by !== me.id ? 'take' : 'claim')}
                onRelease={() => void run({ kind: 'claim', id: current.id, claim: false }, 'Freigegeben.')}
              />
            )
          }
        />
      )}
      {claimAsk && current && (
        <ClaimDialog
          title={
            claimAsk === 'take'
              ? `${holderName} tickert dieses Spiel. Trotzdem übernehmen?`
              : `Du tickerst ${entryWhen(current)} ${matchText(current)}.`
          }
          text={
            claimAsk === 'take'
              ? `${holder?.name || 'Das andere Handy'} sieht danach, dass du tickerst.`
              : 'Die anderen Trainer sehen das im Spielplan. Am Spieltag steht das Spiel oben auf deinem Startbildschirm.'
          }
          yesLabel={claimAsk === 'take' ? 'Übernehmen' : 'Ja, ich tickere'}
          askName={me.name === undefined}
          onYes={(name) => void claim(name)}
          onNo={() => setClaimAsk(null)}
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
      {toast}
    </main>
  );
}
