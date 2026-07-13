import { useMemo } from 'react';
import type { PlayerState, Tile } from '../game/types';
import { TileView } from './Tile';
import { ExposureRow } from './ExposureRow';

type Props = {
  player: PlayerState;
  selectedIds: string[];
  onTileClick: (tile: Tile) => void;
  disabled?: boolean;
  label: string;
};

// Stable order for East's rack: numbers by suit+rank, then winds, dragons,
// flowers, jokers. The store shuffles ids but for display we sort for the
// player's sanity.
const SORT_ORDER = ['number', 'wind', 'dragon', 'flower', 'joker'] as const;

function sortTiles(rack: readonly Tile[]): Tile[] {
  const key = (t: Tile): string => {
    const kindIdx = SORT_ORDER.indexOf(t.kind);
    let sub = '';
    if (t.kind === 'number') sub = `${t.suit}-${t.rank}`;
    else if (t.kind === 'wind') sub = t.wind;
    else if (t.kind === 'dragon') sub = t.color;
    return `${kindIdx}-${sub}-${t.id}`;
  };
  return [...rack].sort((a, b) => key(a).localeCompare(key(b)));
}

export function PlayerRack({
  player,
  selectedIds,
  onTileClick,
  disabled,
  label,
}: Props): React.ReactElement {
  const sorted = useMemo(() => sortTiles(player.rack), [player.rack]);
  const selected = new Set(selectedIds);
  return (
    <div style={{ border: '2px solid #333', padding: 8, margin: 4 }}>
      <div>
        <strong>{label}</strong> — {player.rack.length} tiles
      </div>
      <div>
        {sorted.map((t) => (
          <TileView
            key={t.id}
            tile={t}
            selected={selected.has(t.id)}
            onClick={() => onTileClick(t)}
            disabled={disabled}
          />
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <ExposureRow exposures={player.exposures} />
      </div>
    </div>
  );
}
