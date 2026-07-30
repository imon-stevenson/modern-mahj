import { useMemo } from 'react';
import { useMahjStore } from '../store';
import { possibleCallsForDiscard } from '../game/turn';
import { matchAgainstAll } from '../game/hands/match';
import { useCallTimer } from '../hooks/useCallTimer';
import { TileView } from './Tile';
import type { CallKind } from '../game/types';

const CALL_LABEL: Record<CallKind, string> = {
  pung: 'Call · Pung',
  kong: 'Call · Kong',
  mahjong: 'Mahjong!',
};

export function CallPrompt(): React.ReactElement | null {
  const awaitingCall = useMahjStore((s) => s.awaitingCall);
  const eastPlayer = useMahjStore((s) => s.players.east);
  // Load once — hands are static per session. Calling the loader inside a
  // Zustand selector returns a fresh reference on failure paths and can loop.
  const loadHands = useMahjStore((s) => s.loadHandsSafe);
  const hands = useMemo(() => loadHands(), [loadHands]);
  const callWithHuman = useMahjStore((s) => s.callWithHuman);
  const passCall = useMahjStore((s) => s.passCall);
  const lastAction = useMahjStore((s) => s.lastAction);
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

  const discarder = lastAction?.kind === 'discard' ? lastAction.seat.toUpperCase() : '';

  return (
    // Non-blocking: anchored top-center with no full-screen scrim, so the human
    // can always see (and rearrange) their rack while deciding whether to call.
    <div
      style={{
        position: 'fixed',
        top: 74,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 100,
        padding: '0 20px',
        pointerEvents: 'none',
      }}
    >
      <div
        role="dialog"
        aria-label="Claim discarded tile"
        className="card-surface"
        style={{
          padding: 24,
          minWidth: 340,
          maxWidth: 440,
          pointerEvents: 'auto',
          boxShadow: '0 24px 60px oklch(0.22 0.05 255 / 0.45)',
          border: '1px solid var(--gold)',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          {discarder} discarded
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <TileView tile={awaitingCall.discardTile} width={64} />
          <div style={{ font: '600 14px var(--font-ui)', color: 'var(--ink-soft)' }}>
            Claim this tile, or let it pass.
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {options.map((kind) => (
            <button
              key={kind}
              type="button"
              className={kind === 'mahjong' ? 'btn btn-gold' : 'btn btn-outline'}
              onClick={() => callWithHuman(kind)}
            >
              {CALL_LABEL[kind]}
            </button>
          ))}
          <button type="button" className="btn btn-outline" onClick={() => passCall()}>
            Pass
          </button>
        </div>

        {secondsLeft !== null && (
          <div style={{ marginTop: 16, font: '600 12px var(--font-ui)', color: 'var(--ink-faint)' }}>
            Auto-pass in{' '}
            <span className="mono" style={{ color: 'var(--suit-red)' }}>
              {secondsLeft}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
