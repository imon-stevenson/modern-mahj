import { useMemo } from 'react';
import { useMahjStore } from '../store';
import { possibleCallsForDiscard } from '../game/turn';
import { matchAgainstAll } from '../game/hands/match';
import { useCallTimer } from '../hooks/useCallTimer';
import { TileView } from './Tile';
import type { CallKind } from '../game/types';

export function CallPrompt(): React.ReactElement | null {
  const awaitingCall = useMahjStore((s) => s.awaitingCall);
  const eastPlayer = useMahjStore((s) => s.players.east);
  // Load once — hands are static per session. Calling the loader inside a
  // Zustand selector returns a fresh reference on failure paths and can loop.
  const loadHands = useMahjStore((s) => s.loadHandsSafe);
  const hands = useMemo(() => loadHands(), [loadHands]);
  const callWithHuman = useMahjStore((s) => s.callWithHuman);
  const passCall = useMahjStore((s) => s.passCall);
  const secondsLeft = useCallTimer();

  if (!awaitingCall) return null;
  if (!awaitingCall.callableBy.includes('east')) return null;

  const options: CallKind[] = possibleCallsForDiscard(
    eastPlayer.rack,
    awaitingCall.discardTile,
  );
  const trial = [...eastPlayer.rack, awaitingCall.discardTile];
  if (matchAgainstAll(trial, eastPlayer.exposures, hands)) options.push('mahjong');

  if (options.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div style={{ background: '#fff', color: '#111', padding: 20, minWidth: 320 }}>
        <div>
          Discard from <strong>{lastDiscarderLabel()}</strong>:{' '}
          <TileView tile={awaitingCall.discardTile} />
        </div>
        <div style={{ marginTop: 12 }}>
          {options.map((kind) => (
            <button
              key={kind}
              type="button"
              style={{ marginRight: 8 }}
              onClick={() => callWithHuman(kind)}
            >
              {kind.toUpperCase()}
            </button>
          ))}
          <button type="button" onClick={() => passCall()}>
            Pass
          </button>
        </div>
        {secondsLeft !== null && (
          <div style={{ marginTop: 8, opacity: 0.7 }}>Auto-pass in {secondsLeft}s</div>
        )}
      </div>
    </div>
  );
}

function lastDiscarderLabel(): string {
  const last = useMahjStore.getState().lastAction;
  if (last?.kind === 'discard') return last.seat.toUpperCase();
  return '';
}
