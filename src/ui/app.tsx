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
      <NavBar route={route} />
      <UpdatePrompt blocked={route.name === 'game'} />
    </>
  );
}
