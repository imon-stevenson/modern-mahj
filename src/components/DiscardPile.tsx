import { useEffect, useRef } from "react"
import type { Tile } from "../game/types"
import { TileView } from "./Tile"
import { useDiscardFlightStore } from "../store/discardFlight"

// Discard tiles stay a single constant size so the pile never reflows/resizes
// as it grows. It lives in a fixed-height box (below) that scrolls internally,
// so the pile's footprint on the mat is stable from the first tile to the last.
const DISCARD_TILE_WIDTH = 34
// ~5 rows tall. Constant regardless of tile count — keeps the mat from jumping.
const DISCARD_BOX_HEIGHT = 180

export function DiscardPile({
  discards,
}: {
  discards: Tile[]
}): React.ReactElement {
  // While a discard is mid-air, keep its landing spot invisible so it isn't
  // shown in the pile and flying simultaneously; it "appears" as the clone lands.
  const inFlightTileId = useDiscardFlightStore((s) => s.inFlightTileId)

  // Keep the newest discards in view as the box fills and starts to scroll.
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [discards.length])

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
      <div
        ref={scrollRef}
        style={{
          height: DISCARD_BOX_HEIGHT,
          width: "100%",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {discards.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              alignContent: "flex-start",
            }}
          >
            {discards.map((t) => (
              <div
                key={t.id}
                style={{
                  visibility: t.id === inFlightTileId ? "hidden" : "visible",
                }}
              >
                <TileView tile={t} width={DISCARD_TILE_WIDTH} dimmed />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
