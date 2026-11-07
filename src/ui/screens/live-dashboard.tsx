import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { joinList } from '../../domain/format';
import { getColor } from '../../domain/jersey-colors';
import {
  boardView,
  dayKey,
  formatClockTime,
  formatDay,
  planSection,
  type BoardCard,
  type PlanRow,
  type PlanSection,
  type RecentTeam,
} from '../../domain/live-board';
import { linkUrl, parseLinkPath, viewerShareText } from '../../domain/live-link';
import { configOf, DEFAULT_LIVE_TITLE, viewerOf } from '../../domain/live-spieltag';
import type { LiveConfig, ViewerLink } from '../../domain/types';
import { getSettings, putSettings } from '../../platform/db';
import { newReceiver, type ReceiverState } from '../../platform/live-receiver';
import type { RelayState } from '../../platform/relay';
import { shareText } from '../../platform/share';
import { pointManifestTo } from '../../platform/web-manifest';
import { ViewerNav } from '../components/viewer-nav';
import { useGoalFlash, useNow } from '../hooks';
import { navigate } from '../router';
import { HelpView } from './help';

/** Spec 006 US3: Dashboard für Eltern (Zuschauer-Link) und in der App (FR-L17). Nur lesen. */

const base = import.meta.env.BASE_URL;

type View = Pick<ViewerLink, 'topic' | 'viewKey' | 'orgPub' | 'title'>;

/** Trikotfarbe; unbekannt (Gegner eines Planspiels): leerer Platzhalter, damit die Namen bündig bleiben. */
function Mark({ color }: { color: string | null }) {
  return (
    <span
      class={color ? 'team__mark' : 'team__mark team__mark--none'}
      style={color ? { background: getColor(color)?.value } : undefined}
      aria-hidden="true"
    />
  );
}

function NoSignal({ label }: { label?: string }) {
  return (
    <svg
      class="dash__icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      <path d="M4 20v-3M9 20v-7M14 20v-11M19 20V5M3 3l18 18" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg class="dash-card__chev" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

const STATE_TEXT: Record<RelayState, string> = {
  live: 'Live',
  connecting: 'Verbinde …',
  offline: 'Keine Verbindung',
};

/** "Stand" ist die letzte bestätigte Verbindung (Lebenszeichen, Meldung), nicht die Uhrzeit (FR-L15). */
function statusDetail(relay: RelayState, liveAt: number | null): string {
  const time = liveAt === null ? '' : `${formatClockTime(liveAt)} Uhr`;
  if (relay === 'live') return time && ` · Stand ${time}`;
  const since = time && ` · Stand von ${time}`;
  return relay === 'offline' ? `${since}. Aktualisiert sich von selbst.` : since;
}

function Card({
  card,
  open,
  flash,
  onToggle,
}: {
  card: BoardCard;
  open: boolean;
  flash: boolean;
  onToggle: () => void;
}) {
  const k = card.key;
  // Tabellenzeilen (Nachtrag 07.11.2026): Heim oben, Gast darunter, Tore rechts; ein Planspiel hat keinen Stand.
  const planned = card.group === 'planned';
  const [homeGoals, awayGoals] = planned ? ['', ''] : card.score.split(':');
  const cls = ['dash-card', card.live ? 'dash-card--live' : '', flash ? 'card--flash' : ''].filter(Boolean).join(' ');
  const stale = card.staleMinutes;
  return (
    <article class={cls} data-testid={`dash-card-${k}`} data-game={card.gameId} data-plan={card.planId ?? undefined}>
      <button
        type="button"
        class="dash-card__btn"
        data-testid={`dash-toggle-${k}`}
        aria-expanded={open}
        aria-controls={`dash-details-${k}`}
        onClick={onToggle}
      >
        <span class="dash-card__match">
          <span class="dash-card__row">
            <Mark color={card.home.color} />
            <span class="dash-card__name">{card.home.name}</span>
            <span class="dash-card__goals" aria-hidden="true">
              {homeGoals}
            </span>
          </span>
          <span class="dash-card__row">
            <Mark color={card.away.color} />
            <span class="dash-card__name">{card.away.name}</span>
            <span class="dash-card__goals" aria-hidden="true">
              {awayGoals}
            </span>
          </span>
          {!planned && (
            <span class="visually-hidden" data-testid={`dash-score-${k}`}>
              {card.score}
            </span>
          )}
          <span class={card.live ? 'dash-card__phase dash-card__phase--live' : 'dash-card__phase'}>
            {card.live && <span class="live-pill__dot" aria-hidden="true" />}
            <span data-testid={`dash-phase-${k}`}>{card.phase}</span>
            {stale !== null && <NoSignal label={`Letzte Meldung vor ${stale} Minuten`} />}
          </span>
        </span>
        <Chevron />
      </button>
      {/* Spec 015 FR-P14: "Danach" bzw. "Nächstes Spiel" ohne Aufklappen. */}
      {card.lines.map((line) => (
        <p key={line} class="dash-card__line" data-testid={`dash-line-${k}`}>
          {line}
        </p>
      ))}
      {open && (
        <div class="dash-card__details" id={`dash-details-${k}`} data-testid={`dash-details-${k}`}>
          <p class="dash-card__info">{card.info}</p>
          {card.shootout && <p class="dash-card__info">{card.shootout}</p>}
          {planned ? (
            <p class="dash-card__info">Noch nicht angelegt</p>
          ) : card.goals.length > 0 ? (
            <ol class="dash-goals" aria-label="Tore, neuestes zuerst">
              {card.goals.map((g, i) => (
                <li
                  key={`${card.goals.length - i}`}
                  class={i === 0 && flash ? 'dash-goal dash-goal--new' : 'dash-goal'}
                  data-testid="dash-goal"
                >
                  <b>{g.minute}</b>
                  <span>{g.score}</span>
                  <span>{g.who}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p class="dash-card__info">Noch keine Tore</p>
          )}
          {stale !== null && (
            <p class="dash-card__note" data-testid={`dash-stale-${k}`}>
              <NoSignal />
              Letzte Meldung vor {stale} Min · Minute läuft weiter
            </p>
          )}
          {card.earlier && (
            <p class="dash-card__more" data-testid={`dash-earlier-${k}`}>
              {card.earlier}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function PlanDay({
  id,
  head,
  count,
  open,
  onToggle,
  rows,
}: {
  id: string;
  head: string;
  count: string;
  open: boolean;
  onToggle: () => void;
  rows: PlanRow[];
}) {
  return (
    <section class="plan__group" data-testid={`dash-plan-${id}`}>
      <button type="button" class="plan__head" aria-expanded={open} onClick={onToggle}>
        <span class="plan__date">{head}</span>
        <span class="plan__count">{count}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon plan__chev">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <div class="plan__rows">
          {rows.map((r) => (
            <div
              key={r.id}
              class={`plan__row${r.cancelled ? ' plan__row--off' : ''}`}
              data-testid={`dash-plan-row-${r.id}`}
            >
              <span class="plan__time">{r.lead}</span>
              <span class="plan__text">
                <strong class="plan__title">{r.title}</strong>
                {r.detail && <span class="plan__detail">{r.detail}</span>}
              </span>
              {r.state ? (
                <span class={`plan__state${r.cancelled ? ' plan__state--off' : ' dash-plan__score'}`}>{r.state}</span>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const games = (n: number): string => (n === 1 ? '1 Spiel' : `${n} Spiele`);

/** Spec 007 FR-N13: zuletzt gewählter Filter "Letzte Spiele" auf diesem Gerät; Fehler (privates Surfen) egal. */
const RECENT_FILTER = 'torticker-recent-filter';
const ALL = 'all';

function savedFilter(): string {
  try {
    return window.localStorage.getItem(RECENT_FILTER) ?? ALL;
  } catch {
    return ALL;
  }
}

/** Spec 007 US3: "Letzte Spiele" ganz unten, beim Öffnen zugeklappt; Filter Alle und je Mannschaft. */
function DashRecent({ recent }: { recent: RecentTeam[] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState(savedFilter);
  if (!recent.some((t) => t.rows.length > 0)) return null;
  const current = recent.some((t) => t.key === filter) ? filter : ALL;
  const all = current === ALL;
  const rows = all
    ? recent.flatMap((t) => t.rows).sort((a, b) => b.at - a.at)
    : (recent.find((t) => t.key === current)?.rows ?? []);
  const pick = (key: string): void => {
    setFilter(key);
    try {
      window.localStorage.setItem(RECENT_FILTER, key);
    } catch {
      // Speicher gesperrt: der Filter gilt nur bis zum Neuladen.
    }
  };
  return (
    <section class="dash-recent" data-testid="dash-recent" aria-labelledby="dash-recent-title">
      <h2 id="dash-recent-title" class="dash-recent__title">
        <button
          type="button"
          class="dash-recent__toggle t-label"
          aria-expanded={open}
          aria-controls="dash-recent-body"
          onClick={() => setOpen(!open)}
        >
          <span>LETZTE SPIELE</span>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" class="icon dash-recent__chev">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h2>
      {open && (
        <div id="dash-recent-body" class="dash-recent__body">
          <div class="dash-recent__filters" role="group" aria-label="Mannschaft wählen">
            {[ALL, ...recent.map((t) => t.key)].map((key) => (
              <button
                key={key}
                type="button"
                class="dash-recent__filter"
                aria-pressed={key === current}
                onClick={() => pick(key)}
              >
                {key === ALL ? 'Alle' : key}
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <p class="dash-recent__note" data-testid="dash-recent-empty">
              Noch keine früheren Spiele
            </p>
          ) : (
            <ol class={`dash-recent__list${all ? ' dash-recent__list--team' : ''}`}>
              {rows.map((r) => (
                <li key={`${r.team}-${r.at}-${r.text}`} class="dash-recent__row" data-testid="dash-recent-row">
                  <span>{r.date}</span>
                  {all && <span class="dash-recent__team">{r.team}</span>}
                  <strong class="dash-recent__score">{r.score}</strong>
                  <span class="dash-recent__text">{r.text}</span>
                </li>
              ))}
            </ol>
          )}
          <p class="dash-recent__note">Bis zu 10 Spiele je Mannschaft, neuestes zuerst.</p>
        </div>
      )}
    </section>
  );
}

/** Spec 015 US7: "Spielplan" unter den Karten, nächstes Datum offen, "Vergangene Spiele" zugeklappt. */
function DashPlan({ section }: { section: PlanSection }) {
  const [open, setOpen] = useState<Set<string> | null>(null);
  if (section.days.length === 0 && section.past.length === 0) return null;
  const expanded = open ?? new Set(section.days[0] ? [section.days[0].date] : []);
  const toggle = (id: string): void => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
  };
  return (
    <section class="dash-plan" data-testid="dash-plan" aria-labelledby="dash-plan-title">
      <h2 id="dash-plan-title" class="dash-plan__title t-label">
        SPIELPLAN
      </h2>
      {section.days.map((d) => (
        <PlanDay
          key={d.date}
          id={d.date}
          head={d.head}
          count={games(d.rows.length)}
          open={expanded.has(d.date)}
          onToggle={() => toggle(d.date)}
          rows={d.rows}
        />
      ))}
      {section.past.length > 0 && (
        <PlanDay
          id="past"
          head="Vergangene Spiele"
          count={games(section.past.length)}
          open={expanded.has('past')}
          onToggle={() => toggle('past')}
          rows={section.past}
        />
      )}
    </section>
  );
}

export function Dashboard({
  view,
  inApp,
  config,
  hidden = false,
  onInfo,
  adopt = false,
}: {
  view: View;
  inApp: boolean;
  config?: LiveConfig | null;
  /** Trainer-Handy: jüngere Konfiguration übernehmen (US5-S1). */
  adopt?: boolean;
  /** Spec 010: bleibt beim Wechsel zur Eltern-Hilfe eingehängt, damit die Verbindung bestehen bleibt. */
  hidden?: boolean;
  /** Titel und Mannschaften für "Teilen" in der Eltern-Leiste (FR-H17). */
  onInfo?: (info: { title: string; teams: string[] }) => void;
}) {
  const receiver = useMemo(
    () =>
      newReceiver(
        view,
        // US5-S1: Auf einem Trainer-Handy übernimmt die App eine jüngere Konfiguration (nachgeladen).
        adopt
          ? {
              onConfig: (signed) => void import('../../platform/live-setup').then((m) => m.adoptReceived(signed, view)),
              // Spec 015 US1-S4: Planspiele anderer Trainer-Handys übernehmen.
              onPlan: (payload, sentAt) =>
                void import('../../platform/live-setup').then((m) => m.adoptPlan(payload, view, sentAt)),
            }
          : {},
        config,
      ),
    [view.topic, view.viewKey, view.orgPub],
  );
  const [state, setState] = useState<ReceiverState>(() => receiver.get());
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  // Ausgeblendet (Eltern-Hilfe offen) reicht ein seltener Takt; die Verbindung bleibt trotzdem bestehen.
  useNow(hidden ? 60_000 : 1000);
  useEffect(() => {
    setState(receiver.get());
    const off = receiver.onChange(() => setState(receiver.get()));
    receiver.start();
    return () => {
      off();
      receiver.stop();
    };
  }, [receiver]);

  const now = Date.now();
  const serverNow = now + state.skew;
  const v = boardView(state.board, serverNow);
  // Spec 015 US7: nur neu berechnen, wenn eine Meldung kam oder der Tag wechselt (nicht jede Sekunde).
  const day = dayKey(serverNow);
  const plan = useMemo(() => planSection(state.board, serverNow), [state.board, day]);
  // Ohne Spiel heute: "Zuletzt" bzw. bei Planspielen "Als Nächstes" (Spec 015 US3).
  const planned = v.cards.filter((c) => c.group === 'planned').length;
  const lastLabel =
    planned === 0 ? 'ZULETZT' : planned === v.cards.length ? 'ALS NÄCHSTES' : 'ZULETZT UND ALS NÄCHSTES';
  const flash = useGoalFlash(v.cards, now, serverNow);
  const title = v.title ?? (view.title || DEFAULT_LIVE_TITLE);
  const teamsKey = v.teams.join('|');
  useEffect(() => onInfo?.({ title, teams: v.teams }), [title, teamsKey]);
  const toggle = (key: string): void =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  return (
    <main class="page dash" data-testid="dashboard" hidden={hidden}>
      <header class="dash__head">
        <img
          class="dash__wappen"
          src={`${base}brand/wappen.svg`}
          alt="Wappen der Sportvg Feuerbach"
          width={26}
          height={31}
        />
        <div class="dash__head-text">
          <h1 class="dash__title" data-testid="dash-title">
            {title}
          </h1>
          <p class="dash__date">{[formatDay(serverNow), ...v.teams].join(' · ')}</p>
        </div>
      </header>
      <div
        class={state.relay === 'offline' ? 'dash__status dash__status--alert' : 'dash__status'}
        data-testid="dash-status"
        data-state={state.relay}
      >
        {state.relay === 'offline' ? <NoSignal /> : <span class="live-pill__dot" aria-hidden="true" />}
        <span>
          <span role="status">{STATE_TEXT[state.relay]}</span>
          {statusDetail(state.relay, state.liveAt)}
        </span>
      </div>
      {v.retired && (
        <p class="dash__status dash__status--alert" role="status" data-testid="dash-retired">
          {inApp
            ? `„${title}“ wurde neu ausgestellt. Füge den neuen Trainer-Link aus eurer Trainergruppe ein (Mehr → Live-Spieltag).`
            : `„${title}“ wurde neu ausgestellt. Bitte den neuen Link aus der Elterngruppe öffnen.`}
        </p>
      )}
      {!v.today && (
        <section class="dash-empty" data-testid="dash-empty">
          <h2 class="dash-empty__title">Heute noch kein Spiel live</h2>
          <p class="dash-empty__text">
            Sobald ein Trainer ein Spiel{v.teams.length > 0 ? ` von ${joinList(v.teams, 'oder')}` : ''} anlegt,
            erscheint es hier.
          </p>
          {v.cards.length > 0 && (
            <p class="dash-empty__label t-label" data-testid="dash-last-label">
              {lastLabel}
            </p>
          )}
        </section>
      )}
      {v.cards.length > 0 && (
        <div class="dash__cards">
          {v.cards.map((c) => (
            <Card
              key={c.key}
              card={c}
              open={open.has(c.key)}
              flash={flash.has(c.gameId)}
              onToggle={() => toggle(c.key)}
            />
          ))}
          {/* Spec 012 FR-S30: Mannschaften ohne Spiel als schlichte Zeile unter den Karten. */}
          {v.waiting.map((w) => (
            <p key={w.key} class="dash-waiting" data-testid={`dash-waiting-${w.key}`}>
              {w.color && <Mark color={w.color} />}
              <span>
                <strong>{w.name}</strong> · heute noch kein Spiel
              </span>
            </p>
          ))}
        </div>
      )}
      <DashPlan section={plan} />
      <DashRecent recent={v.recent} />
      <footer class="dash__foot">
        {v.cards.length > 0 && <p>Tippe auf ein Spiel für Tore und Details.</p>}
        {!inApp && (
          <>
            <p>
              Nur lesen. Die Stände kommen verschlüsselt von den Handys am Spielfeldrand. Tipp: Seite als Lesezeichen
              oder auf dem Home-Bildschirm speichern, der Link gilt die ganze Saison.
            </p>
            <p>
              <a class="link-btn" href="#/">
                Zum Torticker
              </a>
            </p>
          </>
        )}
      </footer>
    </main>
  );
}

const sameView = (a: ViewerLink | null, b: ViewerLink): boolean =>
  !!a && a.topic === b.topic && a.viewKey === b.viewKey && a.orgPub === b.orgPub && a.title === b.title;

/**
 * `#/live/<Daten>`: Zuschauer-Link (US1-S5, FR-L12); merkt sich den Link für den Start (R-L6) und nennt ihn im
 * Manifest als Startadresse (FR-L16).
 * Spec 010: Eltern-Leiste mit "Spieltag", "Teilen" und Eltern-Hilfe unter `#/live/<Daten>/hilfe[/<id>]`.
 */
export function ViewerScreen({
  data,
  help = false,
  entry = null,
}: {
  data: string;
  help?: boolean;
  entry?: string | null;
}) {
  const link = useMemo(() => parseLinkPath(`/live/${data}`), [data]);
  const [info, setInfo] = useState<{ title: string; teams: string[] } | null>(null);
  const [msg, setMsg] = useState('');
  const msgTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(msgTimer.current), []);
  // FR-L16: "Zum Home-Bildschirm" legt den Zuschauer-Link ab (iOS nimmt die Startadresse des Manifests).
  useEffect(() => (link.kind === 'view' ? pointManifestTo(`/live/${data}`) : undefined), [link, data]);
  useEffect(() => {
    if (link.kind !== 'view') return;
    void getSettings()
      .then((s) => (sameView(s.liveView, link.view) ? undefined : putSettings({ ...s, liveView: link.view })))
      .catch(() => undefined);
  }, [link]);
  if (link.kind !== 'view') {
    return (
      <main class="page dash" data-testid="dashboard-invalid">
        <h1 class="start__bar t-kopfzeile">TORTICKER</h1>
        <p class="dash-empty__text dash__invalid">
          Dieser Zuschauer-Link ist nicht gültig. Bitte den ganzen Link aus der Elterngruppe öffnen.
        </p>
      </main>
    );
  }
  const path = `/live/${data}`;
  const share = async (): Promise<void> => {
    const url = linkUrl(`${window.location.origin}${base}`, path);
    const res = await shareText(
      viewerShareText(info?.title ?? (link.view.title || DEFAULT_LIVE_TITLE), info?.teams ?? [], url),
    );
    const text = res === 'copied' ? 'Link kopiert.' : res === 'failed' ? 'Teilen hat nicht geklappt.' : '';
    clearTimeout(msgTimer.current);
    setMsg(text);
    if (text) msgTimer.current = setTimeout(() => setMsg(''), 4000);
  };
  return (
    <>
      <Dashboard view={link.view} inApp={false} hidden={help} onInfo={setInfo} />
      {help && <HelpView mode="parents" base={`${path}/hilfe`} entryId={entry} />}
      <ViewerNav active={help ? 'help' : 'dash'} base={path} onShare={() => void share()} />
      {msg && (
        <p class="viewer-toast" role="status" data-testid="viewer-msg">
          {msg}
        </p>
      )}
    </>
  );
}

/** `#/live-spieltag/dashboard`: Dashboard des eigenen Live-Spieltags in der App (FR-L17). */
export function AppDashboardScreen() {
  const [view, setView] = useState<{ view: View; config: LiveConfig | null; adopt: boolean } | null | undefined>(
    undefined,
  );
  useEffect(() => {
    getSettings()
      .then((s) => {
        if (s.live) setView({ view: viewerOf(s.live), config: configOf(s.live.config), adopt: true });
        else setView(s.liveView ? { view: s.liveView, config: null, adopt: false } : null);
      })
      .catch(() => setView(null));
  }, []);
  if (view === undefined) return <main class="page" aria-busy="true" />;
  if (view === null) {
    return (
      <main class="page dash" data-testid="dashboard-none">
        <p class="dash-empty__text dash__invalid">Noch kein Live-Spieltag auf diesem Handy.</p>
        <button type="button" class="btn btn--secondary" onClick={() => navigate('/live-spieltag')}>
          Zum Live-Spieltag
        </button>
      </main>
    );
  }
  return <Dashboard view={view.view} config={view.config} adopt={view.adopt} inApp />;
}
