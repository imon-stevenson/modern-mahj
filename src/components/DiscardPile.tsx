import type { Tile } from "../game/types"
import { TileView } from "./Tile"
import { useDiscardFlightStore } from "../store/discardFlight"

// Shrink the discard tiles as the pile grows so every tile stays visible without
// the pile getting absurdly tall. Never smaller than a still-legible size.
function discardTileWidth(count: number): number {
  if (count <= 20) return 42
  if (count <= 36) return 36
  if (count <= 54) return 30
  if (count <= 75) return 26
  return 24
}

export function DiscardPile({
  discards,
}: {
  discards: Tile[]
}): React.ReactElement {
  // While a discard is mid-air, keep its landing spot invisible so it isn't
  // shown in the pile and flying simultaneously; it "appears" as the clone lands.
  const inFlightTileId = useDiscardFlightStore((s) => s.inFlightTileId)
  const tileWidth = discardTileWidth(discards.length)
  return (
    <div
      id="discard-pile"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        width: "100%",
      }}
    >
      <div
        style={{
          font: "700 11px var(--font-ui)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--felt-ink-mute)",
        }}
      >
        Discarded Tiles{" "}
        <span className="mono" style={{ color: "var(--felt-ink-soft)" }}>
          · {discards.length}
        </span>
      </div>
      {discards.length === 0 ? (
        <div
          style={{
            font: "500 12px var(--font-ui)",
            color: "var(--felt-ink-mute)",
            opacity: 0.7,
          }}
        >
          No discards yet
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
            width: "100%",
            justifyContent: "center",
          }}
        >
          {discards.map((t) => (
            <div
              key={t.id}
              style={{ visibility: t.id === inFlightTileId ? "hidden" : "visible" }}
            >
              <TileView tile={t} width={tileWidth} dimmed />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
