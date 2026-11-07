import { useEffect, useState } from 'preact/hooks';
import type { FunctionComponent } from 'preact';
import { NavBar } from './components/nav-bar';
import { UpdatePrompt } from './components/update-prompt';
import { useRoute } from './router';
import { GameDetailsScreen } from './screens/game-details';
import { GameScreen } from './screens/game';
import { HistoryScreen } from './screens/history';
import { MoreScreen } from './screens/more';
import { NewGameScreen } from './screens/new-game';
import { RosterScreen } from './screens/roster';
import { SettingsScreen } from './screens/settings';
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
const loadViewer = () => import('./screens/live-dashboard').then((m) => m.ViewerScreen);
const loadAppDashboard = () => import('./screens/live-dashboard').then((m) => m.AppDashboardScreen);

export function App() {
  const route = useRoute();
  return (
    <>
      {route.name === 'start' && <StartScreen />}
      {route.name === 'new' && <NewGameScreen key={route.plan ?? ''} plan={route.plan} />}
      {route.name === 'roster' && <RosterScreen />}
      {route.name === 'history' && <HistoryScreen />}
      {route.name === 'more' && <MoreScreen />}
      {route.name === 'settings' && <SettingsScreen />}
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
      <UpdatePrompt blocked={route.name === 'game'} />
    </>
  );
}
