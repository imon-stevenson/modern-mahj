import type { Exposure } from '../game/types';
import { TileView } from './Tile';

export function ExposureRow({ exposures }: { exposures: Exposure[] }): React.ReactElement {
  if (exposures.length === 0) return <div style={{ opacity: 0.5 }}>(no exposures)</div>;
  return (
    <div>
      {exposures.map((ex, i) => (
        <span key={i} style={{ marginRight: 8 }}>
          <small style={{ opacity: 0.7 }}>{ex.kind}: </small>
          {ex.tiles.map((t) => (
            <TileView key={t.id} tile={t} />
          ))}
        </span>
      ))}
    </div>
  );
}
