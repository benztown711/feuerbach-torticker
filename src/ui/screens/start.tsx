import { useEffect, useState } from 'preact/hooks';
import { teamShortLabel } from '../../domain/history';
import { isRetired, titleOf } from '../../domain/live-spieltag';
import type { Game, Settings } from '../../domain/types';
import { findOpenGame, getSettings, listGames } from '../../platform/db';
import { onLiveSettings, onPlanChanged } from '../../platform/live-events';
import type { PlanChoice } from '../../platform/live-setup';
import { navigate, parseHash } from '../router';
import { readClipboard } from '../clipboard';

const base = import.meta.env.BASE_URL;

const atStart = (): boolean => parseHash(window.location.hash).name === 'start';

/** Nur wenn die App auf dem Startbildschirm startet, öffnet sie ggf. das gemerkte Dashboard (R-L6). */
let redirectChecked = !atStart();

/**
 * Spec 006 R-L6 (FR-L16): Startet der Torticker ohne eigene Spiele und Mannschaften, aber mit einem
 * gemerkten Zuschauer-Link (z. B. vom Home-Bildschirm), öffnet er dieses Dashboard.
 */
async function viewerToOpen(): Promise<string | null> {
  const s = await getSettings();
  if (!s.liveView || s.live || s.teams.length > 0) return null;
  if ((await listGames()).length > 0) return null;
  // Nachgeladen, damit das Hauptbundle klein bleibt (R-L7).
  const { viewerLinkPath } = await import('../../domain/live-link');
  return viewerLinkPath(s.liveView);
}

type StartCoupleModule = typeof import('../components/start-couple');

/** Spec 012 FR-S01, FR-S04: Hinweis zum Koppeln bzw. Zeile "Live: …" unter "Neues Spiel". */
function LiveStart({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [flow, setFlow] = useState<{ text: string | null; mod: StartCoupleModule } | null>(null);
  const [msg, setMsg] = useState('');
  const live = settings.live;

  const onPaste = (): void => {
    setMsg('');
    // Erst lesen, dann nachladen: das Koppeln bleibt außerhalb des Hauptbundles (R-L7).
    void Promise.all([readClipboard(), import('../components/start-couple')])
      .then(([text, mod]) => setFlow({ text, mod }))
      .catch(() => setMsg('Das hat nicht geklappt. Bitte erneut versuchen.'));
  };

  return (
    <>
      {live && !isRetired(live) ? (
        <button
          type="button"
          class="start__live"
          data-testid="start-live-line"
          onClick={() => navigate('/live-spieltag')}
        >
          <span class="live-pill__dot start__live-dot" aria-hidden="true" />
          <span class="start__live-text">
            Live: {titleOf(live)} · {live.teams.map((t) => teamShortLabel(t.name)).join(', ')}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon start__live-chevron">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <section class="card start__trainer" data-testid="start-trainer-card">
          <p class="start__trainer-text">
            {live ? (
              `„${titleOf(live)}“ wurde neu ausgestellt. Füge den neuen Trainer-Link ein.`
            ) : (
              <>
                <strong>Trainer?</strong> Füge den Trainer-Link aus der Trainergruppe ein.
              </>
            )}
          </p>
          <button type="button" class="btn btn--secondary" data-testid="btn-start-paste" onClick={onPaste}>
            Trainer-Link einfügen
          </button>
          {msg && (
            <p class="field__error" role="status">
              {msg}
            </p>
          )}
        </section>
      )}
      {flow && (
        <flow.mod.StartCouple
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
    </>
  );
}

/**
 * Spec 015 US6-S5 FR-P28: "Heute tickerst du" mit den eigenen Vormerkungen von heute; ein Tipp öffnet "Neues Spiel"
 * mit dem Planspiel. Nachgeladen über live-setup, nur auf Trainer-Handys.
 */
function TodayClaims({ settings }: { settings: Settings }) {
  const [claims, setClaims] = useState<PlanChoice[]>([]);
  const live = settings.live;
  const active = !!live?.orgKey && !isRetired(live);
  useEffect(() => {
    if (!live || !active) return;
    let alive = true;
    const load = (): void =>
      void import('../../platform/live-setup')
        .then((m) => m.todayClaims(live))
        .then((c) => alive && setClaims(c))
        .catch(() => undefined);
    load();
    const off = onPlanChanged(load);
    return () => {
      alive = false;
      off();
    };
  }, [live?.topic, live?.orgPub, active]);
  if (!active || claims.length === 0) return null;
  return (
    <section class="start__mine" aria-labelledby="start-mine-title" data-testid="start-claims">
      <h2 id="start-mine-title" class="t-label start__mine-title">
        HEUTE TICKERST DU
      </h2>
      {claims.map((c) => (
        <button
          key={c.entry.id}
          type="button"
          class="start__mine-btn"
          data-testid={`start-claim-${c.entry.id}`}
          onClick={() => navigate(`/neu/plan/${c.entry.id}`)}
        >
          <span class="start__mine-text">
            <strong>{c.entry.time ? `${c.entry.time} · ${c.match}` : c.match}</strong>
            <span>{c.detail}</span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ))}
    </section>
  );
}

export function StartScreen() {
  const [open, setOpen] = useState<Game | undefined>();
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    void findOpenGame().then(setOpen);
    void getSettings().then(setSettings);
    if (redirectChecked) return;
    redirectChecked = true;
    void viewerToOpen()
      // Nur umleiten, wenn noch niemand weitergetippt hat ("Neues Spiel").
      .then((path) => path && atStart() && navigate(path, true))
      .catch(() => undefined);
  }, []);
  // Spec 006 US5-S3: "neu ausgestellt" von einem anderen Trainer-Handy sofort zeigen.
  useEffect(() => onLiveSettings(setSettings), []);
  return (
    <main class="start">
      <h1 class="start__bar t-kopfzeile">TORTICKER</h1>
      <img
        class="start__wappen"
        src={`${base}brand/wappen.svg`}
        alt="Wappen der Sportvg Feuerbach"
        width={84}
        height={100}
      />
      <p class="start__verein t-zwischentitel">Sportvg Feuerbach</p>
      <div class="start__actions">
        {settings && <TodayClaims settings={settings} />}
        {open && (
          <button
            type="button"
            class="btn btn--primary btn--large"
            data-testid="btn-continue"
            onClick={() => navigate(`/spiel/${open.id}`)}
          >
            Spiel fortsetzen: {open.opponent}
          </button>
        )}
        <button
          type="button"
          class={open ? 'btn btn--secondary btn--large' : 'btn btn--primary btn--large'}
          data-testid="btn-new-game"
          onClick={() => navigate('/neu')}
        >
          Neues Spiel
        </button>
        {settings && <LiveStart settings={settings} onChange={setSettings} />}
      </div>
    </main>
  );
}
