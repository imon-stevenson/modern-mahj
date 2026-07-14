import type { Exposure } from '../game/types';
import { TileView } from './Tile';

const KIND_LABEL: Record<string, string> = {
  pair: 'Pair',
  pung: 'Pung',
  kong: 'Kong',
  quint: 'Quint',
  sextet: 'Sextet',
};

export function ExposureRow({
  exposures,
  tileWidth = 40,
}: {
  exposures: Exposure[];
  tileWidth?: number;
}): React.ReactElement | null {
  if (exposures.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
      {exposures.map((ex, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              font: '600 10px var(--font-ui)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--felt-ink-mute)',
            }}
          >
            {KIND_LABEL[ex.kind] ?? ex.kind}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {ex.tiles.map((t) => (
              <TileView key={t.id} tile={t} width={tileWidth} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
