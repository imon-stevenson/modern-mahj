import { useState } from "react"
import { useMahjStore } from "../store"
import { HandPattern } from "./HandPattern"
import { TileView } from "./Tile"
import { arrangeWinningHand } from "../game/hands/match"
import type { Seat } from "../game/types"

const SEAT_LABEL: Record<Seat, string> = {
  east: "You",
  south: "South",
  west: "West",
  north: "North",
}

// Terminal "show hand" state shown after any Mahjong: blurs the mat and overlays
// the winner's tiles laid out in the order the hand is written on the card. For a
// human win the EmojiRain (higher z-index) still rains celebration on top.
export function ShowHandOverlay(): React.ReactElement | null {
  const phase = useMahjStore((s) => s.phase)
  const winner = useMahjStore((s) => s.winner)
  const winningHand = useMahjStore((s) => s.winningHand)
  const players = useMahjStore((s) => s.players)
  const requestNewGame = useMahjStore((s) => s.requestNewGame)
  const [dismissed, setDismissed] = useState(false)

  const active = phase === "ended" && winner !== null && winningHand !== null
  // Re-arm for the next win: reset the dismissal when we (re)enter the ended
  // state, tracked across renders without an effect.
  const [wasActive, setWasActive] = useState(active)
  if (active !== wasActive) {
    setWasActive(active)
    if (active && dismissed) setDismissed(false)
  }

  if (!active || dismissed) return null

  const seat = winner!
  const p = players[seat]
  const groups = arrangeWinningHand(p.rack, p.exposures, winningHand!)
  const youWon = seat === "east"

  return (
    <div
      // Below EmojiRain (z 2000) so the celebration rains on top of the reveal.
      className="fixed inset-0 z-[1000] flex items-center justify-center px-4 py-6 bg-[oklch(0.15_0.03_258_/_0.62)] backdrop-blur-[8px] overflow-y-auto"
    >
      <div
        className={`card-surface max-w-[880px] w-full rounded-lg p-[clamp(20px,4vw,36px)] border border-solid shadow-[0_24px_64px_oklch(0.15_0.03_258_/_0.55)] text-center flex flex-col gap-[18px] items-center ${
          youWon ? "border-gold" : "border-hairline"
        }`}
      >
        <div className="flex flex-col gap-1">
          <div
            className={`font-ui text-[26px] font-extrabold tracking-[-0.01em] ${
              youWon ? "text-gold-ink" : "text-tile-navy"
            }`}
          >
            {youWon ? "Mahjong! You win 🎉" : `${SEAT_LABEL[seat]} wins`}
          </div>
          <HandPattern hand={winningHand!} />
          <div className="eyebrow opacity-80">
            {winningHand!.section} · Line {winningHand!.line}
            {winningHand!.closed ? " · Concealed" : ""}
          </div>
        </div>

        {/* Winning tiles, in the order the hand is written on the card. Groups
            are separated by a wider gap; the whole row scrolls if it's narrow. */}
        <div className="flex flex-wrap justify-center items-end gap-5 max-w-full">
          {groups ? (
            groups.map((g, gi) => (
              <div key={gi} className="flex gap-[3px]">
                {g.tiles.map((t) => (
                  <TileView key={t.id} tile={t} width={46} />
                ))}
              </div>
            ))
          ) : (
            // Fallback (shouldn't happen): show the raw tiles ungrouped.
            <div className="flex flex-wrap gap-[3px]">
              {[...p.rack, ...p.exposures.flatMap((e) => e.tiles)].map((t) => (
                <TileView key={t.id} tile={t} width={46} />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-1">
          <button
            type="button"
            className="btn btn-navy"
            onClick={() => setDismissed(true)}
          >
            View board
          </button>
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => requestNewGame()}
          >
            New game
          </button>
        </div>
      </div>
    </div>
  )
}
