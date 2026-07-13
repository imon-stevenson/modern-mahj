import { useMahjStore } from '../store';

export function GameOverBanner(): React.ReactElement | null {
  const phase = useMahjStore((s) => s.phase);
  const winner = useMahjStore((s) => s.winner);
  const winningHand = useMahjStore((s) => s.winningHand);
  if (phase !== 'ended') return null;
  return (
    <div
      style={{
        border: '2px solid #333',
        padding: 12,
        margin: 4,
        background: '#ffe',
      }}
    >
      <div>
        <strong>Game over.</strong>{' '}
        {winner
          ? `${winner.toUpperCase()} declared Mahjong.`
          : 'Wall exhausted — no winner this hand.'}
      </div>
      {winningHand && (
        <div style={{ marginTop: 4 }}>
          Winning hand: <em>{winningHand.description}</em> ({winningHand.section} L
          {winningHand.line})
        </div>
      )}
    </div>
  );
}
