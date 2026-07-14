import { useMahjStore } from '../store';
import { PlayerRack } from './PlayerRack';
import { OpponentRack } from './OpponentRack';
import { DiscardPile } from './DiscardPile';
import { CharlestonUI } from './CharlestonUI';
import { CallPrompt } from './CallPrompt';
import { GameOverBanner } from './GameOverBanner';

export function Board(): React.ReactElement {
  const phase = useMahjStore((s) => s.phase);
  const players = useMahjStore((s) => s.players);
  const currentSeat = useMahjStore((s) => s.currentSeat);
  const discards = useMahjStore((s) => s.discards);
  const wall = useMahjStore((s) => s.wall);
  const charleston = useMahjStore((s) => s.charleston);
  const toggle = useMahjStore((s) => s.toggleTileSelection);
  const humanDiscard = useMahjStore((s) => s.humanDiscard);
  const humanDraw = useMahjStore((s) => s.humanDraw);

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
  };

  const actionSlot = isCharleston ? (
    <CharlestonUI />
  ) : isPlay ? (
    <PlayActions
      eastIsCurrent={eastIsCurrent}
      needsDraw={needsDraw}
      currentSeat={currentSeat}
      onDraw={humanDraw}
    />
  ) : null;

  return (
    <div>
      <GameOverBanner />
      <div
        style={{
          background: 'var(--felt)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          display: 'grid',
          gap: 18,
          gridTemplateColumns: 'minmax(150px, 1fr) 2.3fr minmax(150px, 1fr)',
          gridTemplateAreas: `
            "west   west   west"
            "north  center south"
            "east   east   east"
          `,
        }}
      >
        <div style={{ gridArea: 'west' }}>
          <OpponentRack seat="west" player={players.west} isCurrent={currentSeat === 'west'} />
        </div>
        <div style={{ gridArea: 'north' }}>
          <OpponentRack seat="north" player={players.north} isCurrent={currentSeat === 'north'} />
        </div>
        <div style={{ gridArea: 'south' }}>
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

        <div style={{ gridArea: 'east' }}>
          <PlayerRack
            player={players.east}
            selectedIds={isCharleston ? selectedIds : []}
            onTileClick={(t) => onEastTile(t.id)}
            disabled={!isCharleston && !(eastIsCurrent && !needsDraw)}
            active={eastIsCurrent || isCharleston}
            actionSlot={actionSlot}
          />
        </div>
      </div>

      <CallPrompt />
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
}: {
  eastIsCurrent: boolean;
  needsDraw: boolean;
  currentSeat: string;
  onDraw: () => void;
}): React.ReactElement {
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
        <button type="button" className="btn btn-gold" onClick={onDraw}>
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
