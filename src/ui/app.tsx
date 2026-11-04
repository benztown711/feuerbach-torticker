import { useEffect, useState } from 'preact/hooks';
import type { FunctionComponent } from 'preact';
import { NavBar } from './components/nav-bar';
import { UpdatePrompt } from './components/update-prompt';
import { useRoute } from './router';
import { GameDetailsScreen } from './screens/game-details';
import { GameScreen } from './screens/game';
import { HelpScreen } from './screens/help';
import { HistoryScreen } from './screens/history';
import { MoreScreen } from './screens/more';
import { NewGameScreen } from './screens/new-game';
import { RosterScreen } from './screens/roster';
import { SettingsScreen } from './screens/settings';
import { StartScreen } from './screens/start';

/** Spec 006 R-L7: selten genutzte Bildschirme werden nachgeladen (Bundle-Budget). */
function Lazy<P extends object>({ load, props }: { load: () => Promise<FunctionComponent<P>>; props: P }) {
  const [Comp, setComp] = useState<FunctionComponent<P> | null>(null);
  useEffect(() => {
    let alive = true;
    void load().then((c) => alive && setComp(() => c));
    return () => {
      alive = false;
    };
  }, [load]);
  return Comp ? <Comp {...props} /> : <main class="page" aria-busy="true" />;
}

const loadLive = () => import('./screens/live').then((m) => m.LiveScreen);
const loadLeadLink = () => import('./screens/lead-link').then((m) => m.LeadLinkScreen);

export function App() {
  const route = useRoute();
  return (
    <>
      {route.name === 'start' && <StartScreen />}
      {route.name === 'new' && <NewGameScreen />}
      {route.name === 'roster' && <RosterScreen />}
      {route.name === 'history' && <HistoryScreen />}
      {route.name === 'more' && <MoreScreen />}
      {route.name === 'settings' && <SettingsScreen />}
      {route.name === 'help' && <HelpScreen />}
      {route.name === 'game' && <GameScreen key={route.id} id={route.id} />}
      {route.name === 'details' && <GameDetailsScreen key={route.id} id={route.id} />}
      {route.name === 'live' && <Lazy load={loadLive} props={{}} />}
      {route.name === 'leadLink' && <Lazy load={loadLeadLink} props={{ data: route.data }} />}
      {route.name !== 'leadLink' && <NavBar route={route} />}
      <UpdatePrompt blocked={route.name === 'game'} />
    </>
  );
}
