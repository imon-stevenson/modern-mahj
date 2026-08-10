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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "oklch(0.15 0.03 258 / 0.62)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        overflowY: "auto",
      }}
    >
      <div
        className="card-surface"
        style={{
          maxWidth: 880,
          width: "100%",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(20px, 4vw, 36px)",
          border: `1px solid ${youWon ? "var(--gold)" : "var(--hairline)"}`,
          boxShadow: "0 24px 64px oklch(0.15 0.03 258 / 0.55)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              font: "800 26px var(--font-ui)",
              letterSpacing: "-0.01em",
              color: youWon ? "var(--gold-ink)" : "var(--tile-navy)",
            }}
          >
            {youWon ? "Mahjong! You win 🎉" : `${SEAT_LABEL[seat]} wins`}
          </div>
          <HandPattern hand={winningHand!} />
          <div className="eyebrow" style={{ opacity: 0.8 }}>
            {winningHand!.section} · Line {winningHand!.line}
            {winningHand!.closed ? " · Concealed" : ""}
          </div>
        </div>

        {/* Winning tiles, in the order the hand is written on the card. Groups
            are separated by a wider gap; the whole row scrolls if it's narrow. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: 20,
            maxWidth: "100%",
          }}
        >
          {groups ? (
            groups.map((g, gi) => (
              <div key={gi} style={{ display: "flex", gap: 3 }}>
                {g.tiles.map((t) => (
                  <TileView key={t.id} tile={t} width={46} />
                ))}
              </div>
            ))
          ) : (
            // Fallback (shouldn't happen): show the raw tiles ungrouped.
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {[...p.rack, ...p.exposures.flatMap((e) => e.tiles)].map((t) => (
                <TileView key={t.id} tile={t} width={46} />
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
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
