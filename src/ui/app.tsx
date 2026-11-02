import { UpdatePrompt } from './components/update-prompt';
import { useRoute } from './router';
import { GameDetailsScreen } from './screens/game-details';
import { GameScreen } from './screens/game';
import { NewGameScreen } from './screens/new-game';
import { StartScreen } from './screens/start';

export function App() {
  const route = useRoute();
  return (
    <>
      {route.name === 'start' && <StartScreen />}
      {route.name === 'new' && <NewGameScreen />}
      {route.name === 'game' && <GameScreen key={route.id} id={route.id} />}
      {route.name === 'details' && <GameDetailsScreen key={route.id} id={route.id} />}
      <UpdatePrompt blocked={route.name === 'game'} />
    </>
  );
}
