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

  if (phase === 'setup') {
    return (
      <div style={{ padding: 8 }}>
        <em>No game in progress. Start a new game to begin.</em>
      </div>
    );
  }

  const isCharleston = phase === 'charleston';
  const isPlay = phase === 'play';
  const eastIsCurrent = isPlay && currentSeat === 'east';
  const selectedIds = charleston.selections.east;

  const onEastTile = (tileId: string) => {
    if (isCharleston) toggle(tileId);
    else if (eastIsCurrent) humanDiscard(tileId);
  };

  return (
    <div>
      <GameOverBanner />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 8 }}>
        <div>
          <OpponentRack seat="west" player={players.west} isCurrent={currentSeat === 'west'} />
        </div>
        <div>
          <OpponentRack seat="north" player={players.north} isCurrent={currentSeat === 'north'} />
          <DiscardPile discards={discards} />
          <div style={{ opacity: 0.6, textAlign: 'center' }}>Wall: {wall.length} tiles</div>
          <OpponentRack seat="south" player={players.south} isCurrent={currentSeat === 'south'} />
        </div>
        <div />
      </div>

      {isCharleston && <CharlestonUI />}

      <PlayerRack
        player={players.east}
        selectedIds={isCharleston ? selectedIds : []}
        onTileClick={(t) => onEastTile(t.id)}
        disabled={!isCharleston && !eastIsCurrent}
        label={
          isCharleston
            ? 'EAST — click tiles to select for the pass'
            : eastIsCurrent
              ? 'EAST — click a tile to discard'
              : 'EAST'
        }
      />

      <CallPrompt />
    </div>
  );
}
