import type { Exposure, Seat } from "../game/types"
import { TileView } from "./Tile"
import { useMahjStore } from "../store"
import { useJokerSwapUi } from "../store/jokerSwapUi"
import { BOT_FLASH_MS, useBotFlash } from "../store/botFlash"

export function ExposureRow({
  exposures,
  tileWidth = 40,
  flip = false,
  seat,
}: {
  exposures: Exposure[]
  tileWidth?: number
  // Rotate 180° so exposed tiles face the other players (table etiquette),
  // appearing upside-down from the owner's point of view.
  flip?: boolean
  // Whose exposures these are—used to target a joker swap.
  seat: Seat
}): React.ReactElement | null {
  const phase = useMahjStore((s) => s.phase)
  const currentSeat = useMahjStore((s) => s.currentSeat)
  const east = useMahjStore((s) => s.players.east)
  const source = useJokerSwapUi((s) => s.source)
  const shakeIds = useJokerSwapUi((s) => s.shakeIds)
  const hiddenIds = useJokerSwapUi((s) => s.hiddenIds)
  const toggleJoker = useJokerSwapUi((s) => s.toggleJoker)
  // Tiles a bot just changed—ringed for as long as its message is up.
  const highlightIds = useBotFlash((s) => s.highlightIds)

  if (exposures.length === 0) return null

  // A joker swap is a turn advantage the human takes after drawing.
  const eastTotal =
    east.rack.length + east.exposures.reduce((n, e) => n + e.tiles.length, 0)
  const swapEnabled =
    phase === "play" && currentSeat === "east" && eastTotal === 14

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
            {ex.tiles.map((t) => {
              const canClick = t.kind === "joker" && swapEnabled
              const isSource = source?.jokerId === t.id
              return (
                <div
                  key={t.id}
                  data-tile-id={t.id}
                  onClick={
                    canClick
                      ? (e) => {
                          e.stopPropagation()
                          toggleJoker({
                            seat,
                            exposureIndex: i,
                            jokerId: t.id,
                          })
                        }
                      : undefined
                  }
                  style={{
                    borderRadius: 8,
                    cursor: canClick ? "pointer" : undefined,
                    visibility: hiddenIds.includes(t.id) ? "hidden" : "visible",
                    boxShadow: isSource
                      ? "0 0 0 3px var(--swap-blue), 0 0 12px 2px var(--swap-blue)"
                      : "none",
                    animation: shakeIds.includes(t.id)
                      ? "tile-shake 450ms ease"
                      : highlightIds.includes(t.id)
                        ? `tile-highlight ${BOT_FLASH_MS}ms ease`
                        : undefined,
                    transition: "box-shadow 120ms ease",
                  }}
                >
                  <TileView tile={t} width={tileWidth} />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
