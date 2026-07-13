import { Board } from './components/Board';
import { NewGameMenu } from './components/NewGameMenu';
import { HandCard } from './components/HandCard';
import { useBotTurns } from './hooks/useBotTurns';

export default function App(): React.ReactElement {
  useBotTurns();
  return (
    <div style={{ padding: 12, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Modern Mahj</h1>
      <NewGameMenu />
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12 }}>
        <Board />
        <HandCard />
      </div>
    </div>
  );
}
