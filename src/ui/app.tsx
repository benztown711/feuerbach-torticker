import { useEffect, useState } from 'preact/hooks';
import type { FunctionComponent } from 'preact';
import { NavBar } from './components/nav-bar';
import { UpdatePrompt } from './components/update-prompt';
import { useRoute } from './router';
import { onSquadNotice } from '../platform/live-events';
import { GameDetailsScreen } from './screens/game-details';
import { GameScreen } from './screens/game';
import { HistoryScreen } from './screens/history';
import { MoreScreen } from './screens/more';
import { NewGameScreen } from './screens/new-game';
import { StartScreen } from './screens/start';

/** Spec 006 R-L7: selten genutzte Bildschirme werden nachgeladen (Bundle-Budget). */
function Lazy<P extends object>({ load, props }: { load: () => Promise<FunctionComponent<P>>; props: P }) {
  const [Comp, setComp] = useState<FunctionComponent<P> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    load()
      .then((c) => alive && setComp(() => c))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [load]);
  if (failed) {
    return (
      <main class="page form" data-testid="lazy-failed">
        <p class="hint">Dieser Bereich konnte nicht geladen werden. Mit Netz neu laden.</p>
        <button type="button" class="btn btn--primary" onClick={() => window.location.reload()}>
          Neu laden
        </button>
      </main>
    );
  }
  return Comp ? <Comp {...props} /> : <main class="page" aria-busy="true" />;
}

const loadLive = () => import('./screens/live').then((m) => m.LiveScreen);
const loadPlan = () => import('./screens/spielplan').then((m) => m.PlanScreen);
/** Spec 010: Hilfe mit rund 40 Einträgen wird nachgeladen (Bundle-Budget), offline aus dem Service Worker. */
const loadHelp = () => import('./screens/help').then((m) => m.HelpScreen);
const loadLeadLink = () => import('./screens/lead-link').then((m) => m.LeadLinkScreen);
/** Spec 015 US5: Kader-Bildschirm mit "Liste einfügen" wird nachgeladen (Bundle-Budget). */
const loadRoster = () => import('./screens/roster').then((m) => m.RosterScreen);
/** Spec 017 R-C6: Einstellungen (mit Sicherung) werden nachgeladen (Bundle-Budget). */
const loadSettings = () => import('./screens/settings').then((m) => m.SettingsScreen);
const loadViewer = () => import('./screens/live-dashboard').then((m) => m.ViewerScreen);
const loadAppDashboard = () => import('./screens/live-dashboard').then((m) => m.AppDashboardScreen);

export function App() {
  const route = useRoute();
  return (
    <>
      {route.name === 'start' && <StartScreen />}
      {route.name === 'new' && <NewGameScreen key={route.plan ?? ''} plan={route.plan} />}
      {route.name === 'roster' && <Lazy load={loadRoster} props={{}} />}
      {route.name === 'history' && <HistoryScreen />}
      {route.name === 'more' && <MoreScreen />}
      {route.name === 'settings' && <Lazy load={loadSettings} props={{}} />}
      {route.name === 'help' && <Lazy load={loadHelp} props={{ entry: route.entry }} />}
      {route.name === 'game' && <GameScreen key={route.id} id={route.id} />}
      {route.name === 'details' && <GameDetailsScreen key={route.id} id={route.id} />}
      {route.name === 'live' && <Lazy load={loadLive} props={{}} />}
      {route.name === 'plan' && <Lazy load={loadPlan} props={{}} />}
      {route.name === 'leadLink' && <Lazy load={loadLeadLink} props={{ data: route.data, kind: route.kind }} />}
      {route.name === 'liveView' && (
        <Lazy key={route.data} load={loadViewer} props={{ data: route.data, help: route.help, entry: route.entry }} />
      )}
      {route.name === 'liveDash' && <Lazy load={loadAppDashboard} props={{}} />}
      {route.name !== 'leadLink' && route.name !== 'liveView' && <NavBar route={route} />}
      <UpdatePrompt route={route.name} />
      <SquadNotice />
    </>
  );
}

/** Spec 016 FR-B09: kurzer Hinweis, wenn geteilte Kader angekommen sind. */
function SquadNotice() {
  const [text, setText] = useState('');
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onSquadNotice((t) => {
      setText(t);
      clearTimeout(timer);
      timer = setTimeout(() => setText(''), 6000);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);
  if (!text) return null;
  return (
    <p class="update-prompt squad-notice" role="status" data-testid="squad-notice">
      {text}
    </p>
  );
}
