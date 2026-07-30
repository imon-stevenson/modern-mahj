import type { Exposure } from "../game/types";
import { TileView } from "./Tile";

export function ExposureRow({
  exposures,
  tileWidth = 40,
  flip = false,
}: {
  exposures: Exposure[];
  tileWidth?: number;
  // Rotate 180° so exposed tiles face the other players (table etiquette),
  // appearing upside-down from the owner's point of view.
  flip?: boolean;
}): React.ReactElement | null {
  if (exposures.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 14,
        transform: flip ? "rotate(180deg)" : undefined,
      }}
    >
      {exposures.map((ex, i) => (
        <div
          key={i}
          style={{ display: "flex", flexDirection: "column", gap: 4 }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {ex.tiles.map((t) => (
              <TileView key={t.id} tile={t} width={tileWidth} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
