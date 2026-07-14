import { Board } from './components/Board';
import { NewGameMenu } from './components/NewGameMenu';
import { HandCard } from './components/HandCard';
import { RulesPanel } from './components/RulesPanel';
import { useBotTurns } from './hooks/useBotTurns';

export default function App(): React.ReactElement {
  useBotTurns();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--paper)',
          borderBottom: '1px solid var(--hairline)',
          padding: '14px clamp(16px, 4vw, 40px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ font: '800 18px var(--font-ui)', letterSpacing: '-0.01em' }}>
          American Mahjong <span style={{ color: 'var(--label-blue)' }}>· Modern Mahj</span>
        </div>
        <NewGameMenu />
      </header>

      <main
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(16px, 3vw, 32px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        <Board />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: '3 1 460px', minWidth: 300 }}>
            <RulesPanel />
          </div>
          <div style={{ flex: '1 1 300px', minWidth: 280 }}>
            <HandCard />
          </div>
        </div>
      </main>
    </div>
  );
}
