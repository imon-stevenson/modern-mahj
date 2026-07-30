import { useEffect, useRef, useState } from 'react';
import { useMahjStore } from '../store';
import { PlayerRack } from './PlayerRack';
import { OpponentRack } from './OpponentRack';
import { DiscardPile } from './DiscardPile';
import { CharlestonUI } from './CharlestonUI';
import { CallPrompt } from './CallPrompt';
import { CharlestonFlightOverlay } from './CharlestonFlightOverlay';
import { DiscardFlightOverlay } from './DiscardFlightOverlay';
import { GameOverBanner } from './GameOverBanner';
import { useDiscardFlight } from '../hooks/useDiscardFlight';

export function Board(): React.ReactElement {
  useDiscardFlight();
  const phase = useMahjStore((s) => s.phase);
  const players = useMahjStore((s) => s.players);
  const currentSeat = useMahjStore((s) => s.currentSeat);
  const discards = useMahjStore((s) => s.discards);
  const wall = useMahjStore((s) => s.wall);
  const charleston = useMahjStore((s) => s.charleston);
  const toggle = useMahjStore((s) => s.toggleTileSelection);
  const humanDiscard = useMahjStore((s) => s.humanDiscard);
  const humanDraw = useMahjStore((s) => s.humanDraw);
  const eastRackOrder = useMahjStore((s) => s.eastRackOrder);
  const reorderEastRack = useMahjStore((s) => s.reorderEastRack);
  const resetEastRackOrder = useMahjStore((s) => s.resetEastRackOrder);
  const lastAction = useMahjStore((s) => s.lastAction);

  // Bumped whenever the human clicks somewhere on the board while they still
  // owe a draw — replays the "Draw tile" button's attention shake.
  const [drawNudge, setDrawNudge] = useState(0);

  // The tile the human just drew stays pinned to the far right of their rack
  // until they discard (turn ends) or drag it into place.
  const drawnTileId =
    lastAction?.kind === 'draw' && lastAction.seat === 'east' ? lastAction.tileId : null;

  if (phase === 'setup') {
    return (
      <div
        style={{
          background: 'var(--felt)',
          borderRadius: 'var(--radius-lg)',
          padding: '64px 40px',
          textAlign: 'center',
          color: 'var(--felt-ink-soft)',
          font: '500 16px var(--font-ui)',
        }}
      >
        No game in progress. Start a new game to take your seat at the table.
      </div>
    );
  }

  const isCharleston = phase === 'charleston';
  const isPlay = phase === 'play';
  const eastIsCurrent = isPlay && currentSeat === 'east';
  const selectedIds = charleston.selections.east;

  const eastTotal =
    players.east.rack.length +
    players.east.exposures.reduce((n, e) => n + e.tiles.length, 0);
  const needsDraw = eastIsCurrent && eastTotal === 13;

  const onEastTile = (tileId: string) => {
    if (isCharleston) toggle(tileId);
    else if (eastIsCurrent && !needsDraw) humanDiscard(tileId);
    // When a draw is owed, clicking a tile does nothing here; the board-level
    // handler below nudges the Draw button instead.
  };

  // While the human owes a draw, any click that isn't the Draw button itself
  // shakes the Draw button to point them at it.
  const onBoardClick = (e: React.MouseEvent) => {
    if (!needsDraw) return;
    if ((e.target as HTMLElement).closest('[data-draw-btn]')) return;
    setDrawNudge((n) => n + 1);
  };

  const actionSlot = isCharleston ? (
    <CharlestonUI />
  ) : isPlay ? (
    <PlayActions
      eastIsCurrent={eastIsCurrent}
      needsDraw={needsDraw}
      currentSeat={currentSeat}
      onDraw={humanDraw}
      nudge={drawNudge}
    />
  ) : null;

  return (
    <div>
      <GameOverBanner />
      <div
        className="board-grid"
        onClick={onBoardClick}
        style={{
          background: 'var(--felt)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
        }}
      >
        <div style={{ gridArea: 'west', display: 'flex', justifyContent: 'center' }}>
          {/* Centered box with open felt on either side, matching N/S width. */}
          <div id="seat-west" style={{ width: '100%', maxWidth: 330 }}>
            <OpponentRack seat="west" player={players.west} isCurrent={currentSeat === 'west'} centerTiles />
          </div>
        </div>
        <div id="seat-north" style={{ gridArea: 'north' }}>
          <OpponentRack seat="north" player={players.north} isCurrent={currentSeat === 'north'} />
        </div>
        <div id="seat-south" style={{ gridArea: 'south' }}>
          <OpponentRack seat="south" player={players.south} isCurrent={currentSeat === 'south'} />
        </div>

        <div
          style={{
            gridArea: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 22,
            padding: '8px 0',
          }}
        >
          <WallIndicator remaining={wall.length} />
          <DiscardPile discards={discards} />
        </div>

        <div id="seat-east" style={{ gridArea: 'east' }}>
          <PlayerRack
            player={players.east}
            selectedIds={isCharleston ? selectedIds : []}
            onTileClick={(t) => onEastTile(t.id)}
            // Enabled on the human's turn even before drawing, so a click on a
            // tile still registers (and nudges the Draw button) rather than
            // being swallowed by a disabled button.
            disabled={!isCharleston && !eastIsCurrent}
            active={eastIsCurrent || isCharleston}
            actionSlot={actionSlot}
            rackOrder={eastRackOrder}
            onReorder={reorderEastRack}
            onResetOrder={resetEastRackOrder}
            pinRightId={drawnTileId}
          />
        </div>
      </div>

      <CallPrompt />
      <CharlestonFlightOverlay />
      <DiscardFlightOverlay />
    </div>
  );
}

function WallIndicator({ remaining }: { remaining: number }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          font: '700 11px var(--font-ui)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--felt-ink-mute)',
        }}
      >
        Wall
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 20,
              height: 28,
              borderRadius: 4,
              background: 'linear-gradient(155deg, oklch(0.36 0.07 255), oklch(0.22 0.06 258))',
              border: '1px solid oklch(0.18 0.05 258)',
              opacity: remaining > i * (remaining / 8) ? 1 : 0.3,
            }}
          />
        ))}
      </div>
      <div className="mono" style={{ font: '600 12px var(--font-mono)', color: 'var(--gold)' }}>
        {remaining} remaining
      </div>
    </div>
  );
}

function PlayActions({
  eastIsCurrent,
  needsDraw,
  currentSeat,
  onDraw,
  nudge,
}: {
  eastIsCurrent: boolean;
  needsDraw: boolean;
  currentSeat: string;
  onDraw: () => void;
  nudge: number;
}): React.ReactElement {
  const btnRef = useRef<HTMLButtonElement>(null);

  // Replay the shake each time `nudge` changes (a mis-click elsewhere). Resetting
  // the animation to 'none' + forcing a reflow restarts it even mid-run.
  useEffect(() => {
    if (!nudge) return;
    const el = btnRef.current;
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'draw-nudge 500ms ease';
  }, [nudge]);

  if (!eastIsCurrent) {
    const name = currentSeat.charAt(0).toUpperCase() + currentSeat.slice(1);
    return (
      <div style={{ font: '600 13px var(--font-ui)', color: 'var(--felt-ink-mute)' }}>
        Waiting for {name} to play…
      </div>
    );
  }
  if (needsDraw) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          ref={btnRef}
          data-draw-btn="true"
          type="button"
          className="btn btn-gold"
          onClick={onDraw}
        >
          Draw tile
        </button>
        <span style={{ font: '600 12px var(--font-ui)', color: 'var(--felt-ink-mute)' }}>
          Draw from the wall to begin your turn.
        </span>
      </div>
    );
  }
  return (
    <div style={{ font: '600 13px var(--font-ui)', color: 'var(--felt-ink-soft)' }}>
      Click a tile to discard it.
    </div>
  );
}
