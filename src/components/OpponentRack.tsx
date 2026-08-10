import type { PlayerState, Seat } from "../game/types"
import { SEAT_LABEL } from "../game/actionText"
import { BOT_FLASH_MS, useBotFlash } from "../store/botFlash"
import { ExposureRow } from "./ExposureRow"
import { TileView } from "./Tile"

// A face-down "hidden" tile stand-in. The store hides bot racks from the human,
// so all we render is the count as a neat row of tile backs.
const HIDDEN = { id: "", kind: "joker" as const }

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
  const flash = useBotFlash((s) => s.flashes[seat])
  return (
    <div
      className={`bg-felt-panel border border-solid rounded-md px-4 py-[14px] flex flex-col gap-2.5 transition-[border-color,box-shadow] duration-[160ms] ease-[ease] ${
        isCurrent
          ? "border-gold shadow-[0_0_0_3px_oklch(0.75_0.13_80_/_0.18)]"
          : "border-felt-border shadow-none"
      }`}
    >
      <div className="flex items-center gap-2">
        {isCurrent && (
          <span className="w-2 h-2 rounded-full bg-gold flex-none" />
        )}
        <span className="font-ui text-[13px] font-bold text-[oklch(0.92_0.01_260)]">
          {BOT_NAME[seat]
            ? `${SEAT_LABEL[seat]} · ${BOT_NAME[seat]}`
            : SEAT_LABEL[seat]}
        </span>
        {isCurrent && (
          <span className="font-ui text-[10px] font-bold tracking-[0.04em] bg-gold text-gold-ink px-[7px] py-[2px] rounded-[20px]">
            THINKING…
          </span>
        )}
      </div>

      {/* What this seat just did (called a tile, redeemed a joker). The row is
          always present, so a message appearing never shifts the card. */}
      <div
        role="status"
        aria-live="polite"
        className="min-h-[15px] font-ui text-[11px] font-semibold leading-[15px] text-gold"
      >
        {flash && (
          <span
            key={flash.nonce}
            className="bot-flash inline-block"
            style={{
              animation: `bot-flash ${BOT_FLASH_MS}ms ease forwards`,
            }}
          >
            {flash.text}
          </span>
        )}
      </div>

      <div className={centerTiles ? "opp-tiles justify-center" : "opp-tiles"}>
        {Array.from({ length: count }).map((_, i) => (
          <TileView key={i} tile={HIDDEN} faceDown width={20} />
        ))}
      </div>

      {/* Reserve the exposure row's height even when empty, so a box is the
          same size with or without exposures — otherwise the first pung/kong
          an opponent exposes would jump the mat (west especially, top row).
          61px is one exposure tile at tileWidth 44 (round(44 * 1.375)). */}
      <div className="min-h-[61px]">
        <ExposureRow exposures={player.exposures} tileWidth={44} seat={seat} />
      </div>
    </div>
  )
}
