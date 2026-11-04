import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { joinList } from '../../domain/format';
import { getColor } from '../../domain/jersey-colors';
import { boardView, formatClockTime, formatDay, type BoardCard } from '../../domain/live-board';
import { linkUrl, parseLinkPath, viewerShareText } from '../../domain/live-link';
import { configOf, DEFAULT_LIVE_TITLE, viewerOf } from '../../domain/live-spieltag';
import type { LiveConfig, ViewerLink } from '../../domain/types';
import { getSettings, putSettings } from '../../platform/db';
import { newReceiver, type ReceiverState } from '../../platform/live-receiver';
import type { RelayState } from '../../platform/relay';
import { shareText } from '../../platform/share';
import { ViewerNav } from '../components/viewer-nav';
import { useNow } from '../hooks';
import { navigate } from '../router';
import { HelpView } from './help';

/** Spec 006 US3: Dashboard für Eltern (Zuschauer-Link) und in der App (FR-L17). Nur lesen. */

const base = import.meta.env.BASE_URL;
/** FR-L15: Hervorhebung nach neuem Tor. */
const FLASH_MS = 5000;
/** Nur Tore aus frischen Meldungen hervorheben, nicht beim Nachladen der letzten 12 Stunden. */
const FRESH_MS = 60_000;

type View = Pick<ViewerLink, 'topic' | 'viewKey' | 'orgPub' | 'title'>;

function Mark({ color }: { color: string }) {
  return <span class="team__mark" style={{ background: getColor(color)?.value }} aria-hidden="true" />;
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
  polling: 'Live, alle 30 Sekunden',
  connecting: 'Verbinde …',
  offline: 'Keine Verbindung',
};

/** "Stand" ist die letzte bestätigte Verbindung (keepalive, Abfrage, Meldung), nicht die Uhrzeit (FR-L15). */
function statusDetail(relay: RelayState, liveAt: number | null): string {
  const time = liveAt === null ? '' : `${formatClockTime(liveAt)} Uhr`;
  if (relay === 'live' || relay === 'polling') return time && ` · Stand ${time}`;
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
  const cls = ['dash-card', card.live ? 'dash-card--live' : '', flash ? 'card--flash' : ''].filter(Boolean).join(' ');
  const stale = card.staleMinutes;
  return (
    <article class={cls} data-testid={`dash-card-${k}`} data-game={card.gameId}>
      <button
        type="button"
        class="dash-card__btn"
        data-testid={`dash-toggle-${k}`}
        aria-expanded={open}
        aria-controls={`dash-details-${k}`}
        onClick={onToggle}
      >
        <span class="dash-card__match">
          <span class="dash-card__team">
            <Mark color={card.home.color} />
            <span>{card.home.name}</span>
          </span>
          <span class="dash-card__mid">
            <span class="dash-card__score" data-testid={`dash-score-${k}`}>
              {card.score}
            </span>
            <span class={card.live ? 'dash-card__phase dash-card__phase--live' : 'dash-card__phase'}>
              {card.live && <span class="live-pill__dot" aria-hidden="true" />}
              <span data-testid={`dash-phase-${k}`}>{card.phase}</span>
              {stale !== null && <NoSignal label={`Letzte Meldung vor ${stale} Minuten`} />}
            </span>
          </span>
          <span class="dash-card__team dash-card__team--away">
            <span>{card.away.name}</span>
            <Mark color={card.away.color} />
          </span>
        </span>
        <Chevron />
      </button>
      {open && (
        <div class="dash-card__details" id={`dash-details-${k}`} data-testid={`dash-details-${k}`}>
          <p class="dash-card__info">{card.info}</p>
          {card.shootout && <p class="dash-card__info">{card.shootout}</p>}
          {card.goals.length > 0 ? (
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

/** Merkt sich die Toranzahl je Spiel und hebt neue Tore einige Sekunden hervor (ohne Ton). */
function useFlash(cards: BoardCard[], now: number, serverNow: number): Set<string> {
  const counts = useRef<Map<string, number> | null>(null);
  const [until, setUntil] = useState<Record<string, number>>({});
  const signature = cards.map((c) => `${c.gameId}:${c.goals.length}`).join('|');
  useEffect(() => {
    const prev = counts.current;
    const next = new Map(cards.map((c) => [c.gameId, c.goals.length]));
    counts.current = next;
    if (!prev) return;
    const fresh = cards.filter(
      (c) => c.goals.length > (prev.get(c.gameId) ?? c.goals.length) && serverNow - c.updatedAt < FRESH_MS,
    );
    if (fresh.length > 0)
      setUntil((u) => ({ ...u, ...Object.fromEntries(fresh.map((c) => [c.gameId, Date.now() + FLASH_MS])) }));
    // Nur bei geänderter Toranzahl (signature), nicht bei jedem neuen Array.
  }, [signature]);
  return new Set(Object.keys(until).filter((id) => (until[id] ?? 0) > now));
}

export function Dashboard({
  view,
  inApp,
  config,
  hidden = false,
  onInfo,
}: {
  view: View;
  inApp: boolean;
  config?: LiveConfig | null;
  /** Spec 009: bleibt beim Wechsel zur Eltern-Hilfe eingehängt, damit die Verbindung bestehen bleibt. */
  hidden?: boolean;
  /** Titel und Mannschaften für "Teilen" in der Eltern-Leiste (FR-H17). */
  onInfo?: (info: { title: string; teams: string[] }) => void;
}) {
  const receiver = useMemo(() => {
    const r = newReceiver(view);
    if (config) r.seed(config);
    return r;
  }, [view.topic, view.viewKey, view.orgPub]);
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
  const flash = useFlash(v.cards, now, serverNow);
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
      {!v.today && (
        <section class="dash-empty" data-testid="dash-empty">
          <h2 class="dash-empty__title">Heute noch kein Spiel live</h2>
          <p class="dash-empty__text">
            Sobald ein Trainer ein Spiel{v.teams.length > 0 ? ` von ${joinList(v.teams, 'oder')}` : ''} anlegt,
            erscheint es hier.
          </p>
          {v.cards.length > 0 && <p class="dash-empty__label t-label">ZULETZT</p>}
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
        </div>
      )}
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
 * `#/live/<Daten>`: Zuschauer-Link (US1-S5, FR-L12); merkt sich den Link für den Start (R-L6).
 * Spec 009: Eltern-Leiste mit "Spieltag", "Teilen" und Eltern-Hilfe unter `#/live/<Daten>/hilfe[/<id>]`.
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
  const [view, setView] = useState<{ view: View; config: LiveConfig | null } | null | undefined>(undefined);
  useEffect(() => {
    getSettings()
      .then((s) => {
        if (s.live) setView({ view: viewerOf(s.live), config: configOf(s.live.config) });
        else setView(s.liveView ? { view: s.liveView, config: null } : null);
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
  return <Dashboard view={view.view} config={view.config} inApp />;
}
