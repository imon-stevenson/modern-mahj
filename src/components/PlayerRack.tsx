import { useMemo, type ReactNode } from 'react';
import type { PlayerState, Tile } from '../game/types';
import { TileView } from './Tile';
import { ExposureRow } from './ExposureRow';

type Props = {
  player: PlayerState;
  selectedIds: string[];
  onTileClick: (tile: Tile) => void;
  disabled?: boolean;
  active?: boolean;
  actionSlot?: ReactNode;
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
  active,
  actionSlot,
}: Props): React.ReactElement {
  const sorted = useMemo(() => sortTiles(player.rack), [player.rack]);
  const selected = new Set(selectedIds);
  const total =
    player.rack.length + player.exposures.reduce((n, e) => n + e.tiles.length, 0);

  return (
    <div
      style={{
        background: 'var(--felt-panel-2)',
        borderRadius: 'var(--radius-md)',
        padding: '18px 22px',
        border: `1px solid ${active ? 'var(--gold)' : 'var(--felt-border)'}`,
        boxShadow: active ? '0 0 0 3px oklch(0.75 0.13 80 / 0.16)' : 'none',
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: active ? 'var(--gold)' : 'var(--felt-divider)',
            }}
          />
          <span style={{ font: '800 14px var(--font-ui)', color: 'var(--felt-ink)' }}>East · You</span>
          {active && (
            <span
              style={{
                font: '700 11px var(--font-ui)',
                background: 'var(--gold)',
                color: 'var(--gold-ink)',
                padding: '3px 8px',
                borderRadius: 20,
              }}
            >
              YOUR TURN
            </span>
          )}
        </div>
        <span className="mono" style={{ font: '600 12px var(--font-mono)', color: 'var(--gold)' }}>
          {total} tiles
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {sorted.map((t) => (
            <TileView
              key={t.id}
              tile={t}
              width={52}
              selected={selected.has(t.id)}
              onClick={() => onTileClick(t)}
              disabled={disabled}
            />
          ))}
        </div>
        {player.exposures.length > 0 && (
          <>
            <div style={{ width: 1, height: 60, background: 'var(--felt-divider)' }} />
            <ExposureRow exposures={player.exposures} tileWidth={44} />
          </>
        )}
      </div>

      {actionSlot && <div style={{ marginTop: 18 }}>{actionSlot}</div>}
    </div>
  );
}
