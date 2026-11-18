import { useEffect, useRef, useState } from 'preact/hooks';
import { teamShortLabel } from '../../domain/history';
import { installPlatform, installSteps, showInstallHint } from '../../domain/install-hint';
import { quickAction, quickTeams, startHint, teamHint, type QuickAction } from '../../domain/live-quick';
import { DEFAULT_LIVE_TITLE, isRetired, titleOf } from '../../domain/live-spieltag';
import { setLive } from '../../domain/live-snapshot';
import { todayKey } from '../../domain/plan';
import type { Game, LiveSpieltag, Settings } from '../../domain/types';
import { getGame, putGame } from '../../platform/db';
import {
  addTeamToLive,
  createLive,
  prepareLive,
  sendGameNow,
  shareViewerLink,
  type PreparedLive,
} from '../../platform/live-setup';
import type { ShareResult } from '../../platform/share';
import { isStandalone } from '../../platform/storage';
import { readClipboard } from '../clipboard';
import { navigate } from '../router';
import { Sheet } from './sheet';
import { StartCouple } from './start-couple';

/**
 * Spec 020 US1 (nachgeladen, research.md R-E10): "Eltern live zuschauen lassen" auf dem Startbildschirm und im
 * Spielmenü, Blatt "Eltern live zuschauen lassen" ("Link einfügen", "Neu starten"). Dazu der übrige Live-Teil des
 * Startbildschirms (Spec 012, Spec 018), damit das Hauptbundle klein bleibt.
 */

/** FR-E11: kurze Statuszeile bzw. Meldeband nach dem Teilen; Abbrechen zeigt nichts. */
export const SHARE_MSG: Record<ShareResult, string> = {
  shared: '',
  copied: 'Link kopiert. Füge ihn in WhatsApp ein.',
  cancelled: '',
  failed: 'Teilen hat nicht geklappt.',
};

const join = (...parts: (string | null)[]): string => parts.filter(Boolean).join(' ');

/** Spiel wieder live senden: wendet die Änderung auf den neuesten Stand an und erfüllt sich, wenn sie gespeichert ist. */
export type GameLive = (live: (g: Game) => Game) => Promise<void>;

/**
 * FR-E04, FR-E05, FR-E09: nach dem Teilen das Spiel wieder live schalten, die fehlende Mannschaft hinzufügen und das
 * Spiel sofort melden. Liefert den Hinweis zur Mannschaft (oder null). Der Live-Schalter geht auf den neuesten Stand
 * des Spiels (das Teilen-Menü kann lange offen sein), und gemeldet wird erst, wenn er gespeichert ist.
 */
export async function afterLive(action: QuickAction, game: Game | null, onGameLive: GameLive): Promise<string | null> {
  if (action.kind !== 'share') return null;
  if (action.makeLive && game) await onGameLive((g) => setLive(g, true)).catch(() => undefined);
  let team = action.team;
  if (team?.kind === 'add') {
    const label = team.label;
    team = await addTeamToLive(team.option).then(
      () => team,
      () => ({ kind: 'missing' as const, label }),
    );
  }
  if (game && game.status !== 'finished') await sendGameNow(game.id).catch(() => undefined);
  return teamHint(team);
}

export interface QuickHost {
  settings: Settings;
  /** Aktuelles Spiel (im Spiel dieses, auf dem Startbildschirm das hinter "Spiel fortsetzen"). */
  game: Game | null;
  /** Spiel wieder live senden (im Spiel über den Spielbildschirm, sonst frisch aus dem Speicher). */
  onGameLive: GameLive;
  /** Ergebnis des Teilens und Hinweise; leer: nichts zeigen. */
  onMsg: (text: string) => void;
  /** Ohne Live-Spieltag: Blatt "Eltern live zuschauen lassen" öffnen. */
  onStart: () => void;
}

/**
 * FR-E04 (R-E1): Mit Live-Spieltag öffnet der Tipp sofort das Teilen-Menü, ohne vorher auf etwas zu warten; Live-Schalter
 * und Mannschaft folgen danach. Ohne Live-Spieltag das Blatt (FR-E06).
 */
export function quickTap(host: QuickHost): void {
  const action = quickAction(host.settings, host.game);
  const live = host.settings.live;
  if (action.kind !== 'share' || !live) {
    if (action.kind === 'start') host.onStart();
    return;
  }
  const shared = shareViewerLink(live);
  void afterLive(action, host.game, host.onGameLive)
    .catch(() => null)
    .then(async (hint) => host.onMsg(join(SHARE_MSG[await shared], hint)));
}

type Done = { kind: 'started' | 'coupled'; live: LiveSpieltag; failed: boolean };

interface SheetProps {
  settings: Settings;
  game: Game | null;
  onGameLive: GameLive;
  onSettings: (s: Settings) => void;
  onClose: () => void;
}

/** FR-E06 bis FR-E10: Blatt "Eltern live zuschauen lassen" ohne Live-Spieltag. */
export function LiveStartSheet({ settings, game, onGameLive, onSettings, onClose }: SheetProps) {
  const ids = quickTeams(settings.teams, game);
  const prepared = useRef<PreparedLive | null>(null);
  const busy = useRef(false);
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [msg, setMsg] = useState('');
  const [flow, setFlow] = useState<{ text: string | null } | null>(null);

  // R-E1: Schlüssel schon beim Öffnen erzeugen (nur auf dem Handy, keine Verbindung), damit "Neu starten" schnell teilt.
  useEffect(() => {
    let alive = true;
    void prepareLive(ids.length)
      .then((p) => alive && (prepared.current = p))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const after = (s: Settings, hintPrefix: string): void =>
    void afterLive(quickAction(s, game), game, onGameLive)
      .catch(() => null)
      .then((hint) => hint && setMsg(join(hintPrefix, hint)));

  /** FR-E07, FR-E08: anlegen, sofort teilen; geht das nicht, bleibt "Link für Eltern teilen". */
  const start = async (): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setMsg('');
    try {
      const p = prepared.current ?? undefined;
      prepared.current = null;
      const s = await createLive({ title: DEFAULT_LIVE_TITLE, teamIds: ids }, p);
      const live = s.live as LiveSpieltag;
      const r = await shareViewerLink(live);
      setDone({ kind: 'started', live, failed: r === 'failed' });
      setMsg(SHARE_MSG[r]);
      onSettings(s);
      after(s, SHARE_MSG[r]);
    } catch {
      busy.current = false;
      setWorking(false);
      setMsg('Das hat nicht geklappt. Bitte erneut versuchen.');
    }
  };

  /** FR-E10: Weg des Startbildschirms (Spec 012 FR-S02); die Zwischenablage direkt im Tipp lesen. */
  const paste = (): void => {
    setMsg('');
    void readClipboard().then((text) => setFlow({ text }));
  };

  if (flow)
    return (
      <StartCouple
        text={flow.text}
        settings={settings}
        onDone={(s) => {
          setFlow(null);
          onSettings(s);
          if (s.live) setDone({ kind: 'coupled', live: s.live, failed: false });
          after(s, '');
        }}
        onClose={() => setFlow(null)}
        onError={() => {
          setFlow(null);
          setMsg('Koppeln hat nicht geklappt. Bitte erneut versuchen.');
        }}
      />
    );

  const status = msg && (
    <p class="live-start__msg" role="status" data-testid="live-start-msg">
      {msg}
    </p>
  );

  if (done) {
    const title = titleOf(done.live);
    return (
      <Sheet title="Eltern live zuschauen lassen" testId="live-start-sheet" onClose={onClose}>
        <p class="sheet__text live-start__done" data-testid="live-start-done">
          {done.kind === 'coupled'
            ? `Gekoppelt mit „${title}“.`
            : done.failed
              ? 'Fertig. Jetzt den Link teilen.'
              : `Fertig. „${title}“ ist live.`}
        </p>
        <button
          type="button"
          class="btn btn--primary live-start__btn"
          data-testid="live-start-share"
          onClick={() => void shareViewerLink(done.live).then((r) => setMsg(SHARE_MSG[r]))}
        >
          Link für Eltern teilen
        </button>
        {status}
        {done.kind === 'started' && (
          <p class="sheet__text sheet__text--muted" data-testid="live-start-trainer">
            Den Trainer-Link für die anderen Trainer findest du unter „Mehr“ → „Live für Eltern“ → „Für Trainer“.
          </p>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet title="Eltern live zuschauen lassen" testId="live-start-sheet" onClose={onClose}>
      <p class="sheet__text" data-testid="live-start-lead">
        Eltern sehen Stand, Minute und Tore live, ohne App.
      </p>
      <div class="live-start__alt">
        <p class="sheet__text" data-testid="live-start-other">
          <strong>Ein anderer Trainer hat schon einen Link?</strong>
        </p>
        <button type="button" class="btn btn--secondary live-start__btn" data-testid="live-start-paste" onClick={paste}>
          Link einfügen
        </button>
      </div>
      <p class="sheet__text" data-testid="live-start-teams">
        {startHint(settings.teams, ids)}
      </p>
      <button
        type="button"
        class="btn btn--primary live-start__btn"
        data-testid="live-start-new"
        disabled={working}
        onClick={() => void start()}
      >
        Neu starten
      </button>
      <p class="sheet__text sheet__text--muted" data-testid="live-start-data">
        Dann gehen Mannschaften, Spielstand und Tore mit Vornamen verschlüsselt an den Dienst des Vereins. Kader, Karten
        und Lesezeichen bleiben auf dem Handy.
      </p>
      {status}
    </Sheet>
  );
}

/** Symbol "live senden" (Linien-Icon, design/README.md). */
export function LiveIcon() {
  return (
    <svg class="icon start__opt-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8" />
    </svg>
  );
}

/** Statuszeile, die nach einigen Sekunden verschwindet (FR-E11). */
function useShortMsg(): [string, (text: string) => void] {
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [
    msg,
    (text) => {
      clearTimeout(timer.current);
      setMsg(text);
      if (text) timer.current = setTimeout(() => setMsg(''), 5_000);
    },
  ];
}

type StartOffersModule = typeof import('./start-offers');

/** Spec 022 R-F1: Kalendertag von "Später" nur auf diesem Gerät merken; ohne Browserspeicher gilt es bis zum Neuladen. */
const INSTALL_LATER = 'torticker-install-later';

function savedLater(): string | null {
  try {
    return window.localStorage.getItem(INSTALL_LATER);
  } catch {
    return null;
  }
}

function saveLater(day: string): void {
  try {
    window.localStorage.setItem(INSTALL_LATER, day);
  } catch {
    // Speicher gesperrt: "Später" gilt nur bis zum Neuladen.
  }
}

/**
 * Spec 022 US1 (FR-F01 bis FR-F05): Hinweis zur Installation unter allen Aktionen des Startbildschirms, solange die App
 * nicht vom Home-Bildschirm läuft. "Später" blendet ihn bis zum nächsten Kalendertag aus.
 */
export function InstallHint({ settings }: { settings: Settings }) {
  const [laterDay, setLaterDay] = useState<string | null>(savedLater);
  const today = todayKey(Date.now());
  if (!showInstallHint({ standalone: isStandalone(), dismissedAt: settings.installHintDismissedAt, laterDay, today }))
    return null;
  return (
    <section class="card start__install" aria-labelledby="start-install-title" data-testid="start-install-hint">
      <h2 id="start-install-title" class="start__install-title">
        Torticker auf den Home-Bildschirm legen
      </h2>
      <p class="start__install-text">Nur dann bleiben deine Spiele dauerhaft gespeichert.</p>
      <p class="start__install-text" data-testid="start-install-how">
        {installSteps(installPlatform(navigator.userAgent, navigator.maxTouchPoints))}
      </p>
      <button
        type="button"
        class="btn btn--quiet start__install-later"
        data-testid="start-install-later"
        onClick={() => {
          saveLater(today);
          setLaterDay(today);
        }}
      >
        Später
      </button>
    </section>
  );
}

/**
 * Live-Teil des Startbildschirms: Spec 018 "E2 übernehmen" (US2) und "Spiele verfolgen" (US1), Spec 020 FR-E01
 * "Eltern live zuschauen lassen", Spec 012 FR-S01 Karte "Trainer? …" mit "Link einfügen".
 */
export function StartLive({
  settings,
  open,
  onChange,
}: {
  settings: Settings;
  open: Game | null;
  onChange: (s: Settings) => void;
}) {
  const [flow, setFlow] = useState<{ text: string | null } | null>(null);
  const [msg, setMsg] = useState('');
  const [quickMsg, setQuickMsg] = useShortMsg();
  const [sheet, setSheet] = useState(false);
  const [offers, setOffers] = useState<StartOffersModule | null>(null);
  const live = settings.live;
  const active = !!live && !isRetired(live);
  // Spec 018 US2: "E2 übernehmen" nachgeladen, nur auf gekoppelten Handys (Hauptbundle, R-L7).
  useEffect(() => {
    if (!active) return;
    let alive = true;
    void import('./start-offers').then((m) => alive && setOffers(m)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [active]);

  const onPaste = (): void => {
    setMsg('');
    void readClipboard().then((text) => setFlow({ text }));
  };

  // Spec 018 FR-002: gekoppelt (nicht neu ausgestellt) oder ein Zuschauer-Link ist bekannt.
  const follow = active ? live : !live ? settings.liveView : undefined;
  const quick = quickAction(settings, open);
  // FR-E04: neuester gespeicherter Stand des Spiels, nicht der beim Öffnen des Startbildschirms.
  const onGameLive: GameLive = async (live) => {
    const g = open ? await getGame(open.id) : undefined;
    if (g) await putGame(live(g));
  };

  return (
    <>
      {active && offers && <offers.StartOffers live={live} />}
      {follow && (
        <button
          type="button"
          class="start__opt"
          data-testid="start-follow"
          onClick={() => navigate('/live-spieltag/dashboard')}
        >
          <svg class="icon start__opt-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span class="start__opt-text">
            <strong>Spiele verfolgen</strong>
            <span data-testid="start-follow-line">
              {active
                ? `${titleOf(live)} · ${live.teams.map((t) => teamShortLabel(t.name)).join(', ')}`
                : settings.liveView?.title}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon start__opt-chevron">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      {quick.kind !== 'hidden' && (
        <button
          type="button"
          class="start__opt"
          data-testid="start-live-quick"
          onClick={() =>
            quickTap({ settings, game: open, onGameLive, onMsg: setQuickMsg, onStart: () => setSheet(true) })
          }
        >
          <LiveIcon />
          <span class="start__opt-text">
            <strong>Eltern live zuschauen lassen</strong>
            <span>Link für die Elterngruppe</span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon start__opt-chevron">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      {quickMsg && (
        <p class="live-start__msg" role="status" data-testid="start-live-msg">
          {quickMsg}
        </p>
      )}
      {/* Spec 020 FR-E62: ein Einstieg; neben dem Knopf steht "Link einfügen" im Blatt, die Karte nur ohne Knopf. */}
      {!active && quick.kind === 'hidden' && (
        <section class="card start__trainer" data-testid="start-trainer-card">
          <p class="start__trainer-text">
            {live ? (
              `„${titleOf(live)}“ wurde neu ausgestellt. Füge den neuen Trainer-Link ein.`
            ) : (
              <>
                <strong>Trainer?</strong> Füge den Link aus der Trainergruppe ein.
              </>
            )}
          </p>
          {/* Spec 022 FR-F20: woher der Link kommt und wie man ihn einfügt. */}
          <p class="start__trainer-text" data-testid="start-trainer-how">
            Den Link schickt dir der Trainer, z. B. per WhatsApp: lange drücken, Kopieren, hier einfügen.
          </p>
          <button type="button" class="btn btn--secondary" data-testid="btn-start-paste" onClick={onPaste}>
            Link einfügen
          </button>
          {msg && (
            <p class="field__error" role="status">
              {msg}
            </p>
          )}
        </section>
      )}
      <InstallHint settings={settings} />
      {flow && (
        <StartCouple
          text={flow.text}
          settings={settings}
          onDone={(s) => {
            setFlow(null);
            onChange(s);
          }}
          onClose={() => setFlow(null)}
          onError={() => {
            setFlow(null);
            setMsg('Koppeln hat nicht geklappt. Bitte erneut versuchen.');
          }}
        />
      )}
      {sheet && (
        <LiveStartSheet
          settings={settings}
          game={open}
          onGameLive={onGameLive}
          onSettings={onChange}
          onClose={() => setSheet(false)}
        />
      )}
    </>
  );
}
