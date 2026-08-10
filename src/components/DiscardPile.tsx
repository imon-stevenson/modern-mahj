import { useEffect, useRef } from "react"
import type { Tile } from "../game/types"
import { TileView } from "./Tile"
import { useDiscardFlightStore } from "../store/discardFlight"

// Discard tiles stay a single constant size so the pile never reflows/resizes
// as it grows. It lives in a fixed-height box (below) that scrolls internally,
// so the pile's footprint on the mat is stable from the first tile to the last.
const DISCARD_TILE_WIDTH = 34

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
    <div id="discard-pile" className="flex flex-col items-center gap-2 w-full">
      <div className="felt-label">
        Discarded Tiles{" "}
        <span className="mono text-felt-ink-soft">· {discards.length}</span>
      </div>
      {/* ~5 rows tall. Constant regardless of tile count—keeps the mat from
          jumping as the pile grows. */}
      <div
        ref={scrollRef}
        className="h-[180px] w-full overflow-y-auto overflow-x-hidden"
      >
        {discards.length === 0 ? (
          <div className="h-full flex items-center justify-center font-ui text-[12px] font-medium text-felt-ink-mute opacity-70">
            No discards yet
          </div>
        ) : (
          <div className="flex gap-[3px] flex-wrap w-full justify-center content-start">
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
