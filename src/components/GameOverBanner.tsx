import { useMahjStore } from '../store';

// Per product decision, the game surfaces only win / loss — never a score or
// the specific winning hand.
export function GameOverBanner(): React.ReactElement | null {
  const phase = useMahjStore((s) => s.phase);
  const winner = useMahjStore((s) => s.winner);
  if (phase !== 'ended') return null;

  const youWon = winner === 'east';
  const wallGame = winner === null;

  const accent = youWon ? 'var(--gold)' : wallGame ? 'var(--felt-divider)' : 'var(--tile-navy)';
  const heading = youWon ? 'Mahjong!' : wallGame ? 'Wall game' : 'Hand lost';
  const sub = youWon
    ? 'You completed a winning hand.'
    : wallGame
      ? 'The wall ran out before anyone won.'
      : 'Another player declared Mahjong first.';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'var(--paper)',
        border: `1px solid var(--hairline)`,
        borderLeft: `6px solid ${accent}`,
        borderRadius: 'var(--radius-md)',
        padding: '18px 22px',
        marginBottom: 16,
      }}
    >
      <div>
        <div style={{ font: '800 22px var(--font-ui)', letterSpacing: '-0.01em' }}>{heading}</div>
        <div style={{ font: '500 14px var(--font-ui)', color: 'var(--ink-soft)', marginTop: 2 }}>
          {sub} Start a new game from the top bar to play again.
        </div>
      </div>
    </div>
  );
}
