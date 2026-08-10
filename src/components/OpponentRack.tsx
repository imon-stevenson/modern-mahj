import type { PlayerState, Seat } from "../game/types"
import { ExposureRow } from "./ExposureRow"
import { TileView } from "./Tile"

// A face-down "hidden" tile stand-in. The store hides bot racks from the human,
// so all we render is the count as a neat row of tile backs.
const HIDDEN = { id: "", kind: "joker" as const }

const SEAT_NAME: Record<Seat, string> = {
  east: "East",
  south: "South",
  west: "West",
  north: "North",
}

const BOT_NAME: Record<Seat, string> = {
  east: "You",
  south: "",
  west: "",
  north: "",
}

export function OpponentRack({
  seat,
  player,
  isCurrent,
  centerTiles = false,
}: {
  seat: Seat
  player: PlayerState
  isCurrent: boolean
  // West spans the full-width top row; centering keeps its 13-tile wall the
  // same visual size as North/South rather than stretched to the left edge.
  centerTiles?: boolean
}): React.ReactElement {
  const count = player.rack.length
  return (
    <div
      style={{
        background: "var(--felt-panel)",
        border: `1px solid ${isCurrent ? "var(--gold)" : "var(--felt-border)"}`,
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 160ms ease, box-shadow 160ms ease",
        boxShadow: isCurrent ? "0 0 0 3px oklch(0.75 0.13 80 / 0.18)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isCurrent && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--gold)",
              flex: "0 0 auto",
            }}
          />
        )}
        <span
          style={{
            font: "700 13px var(--font-ui)",
            color: "oklch(0.92 0.01 260)",
          }}
        >
          {BOT_NAME[seat]
            ? "SEAT_NAME[seat]} · {BOT_NAME[seat]"
            : SEAT_NAME[seat]}
        </span>
        {isCurrent && (
          <span
            style={{
              font: "700 10px var(--font-ui)",
              letterSpacing: "0.04em",
              background: "var(--gold)",
              color: "var(--gold-ink)",
              padding: "2px 7px",
              borderRadius: 20,
            }}
          >
            THINKING…
          </span>
        )}
      </div>

      <div
        className="opp-tiles"
        style={centerTiles ? { justifyContent: "center" } : undefined}
      >
        {Array.from({ length: count }).map((_, i) => (
          <TileView key={i} tile={HIDDEN} faceDown width={20} />
        ))}
      </div>

      {/* Reserve the exposure row's height even when empty, so a box is the
          same size with or without exposures — otherwise the first pung/kong
          an opponent exposes would jump the mat (west especially, top row). */}
      <div style={{ minHeight: 56 }}>
        <ExposureRow exposures={player.exposures} tileWidth={44} seat={seat} />
      </div>
    </div>
  )
}
