import type { Tile } from '../game/types';
import { TileView } from './Tile';

export function DiscardPile({ discards }: { discards: Tile[] }): React.ReactElement {
  return (
    <div style={{ border: '1px dashed #666', padding: 8, minHeight: 60 }}>
      <div>
        <strong>Discards</strong> ({discards.length})
      </div>
      <div>
        {discards.slice(-30).map((t) => (
          <TileView key={t.id} tile={t} />
        ))}
      </div>
    </div>
  );
}
