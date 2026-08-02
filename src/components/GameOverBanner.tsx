import { useEffect } from "react"
import { useMahjStore } from "../store"

// Per product decision, the game surfaces only win / loss — never a score or
// the specific winning hand.
export function GameOverBanner(): React.ReactElement | null {
  const phase = useMahjStore((s) => s.phase)
  const winner = useMahjStore((s) => s.winner)
  const ended = phase === "ended"

  // The banner sits at the top; scroll up to it when the game ends so it isn't
  // missed while the player is looking at their rack lower on the page.
  useEffect(() => {
    if (!ended || typeof window === "undefined") return
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
  }, [ended])

  if (!ended) return null

  const youWon = winner === "east"
  const wallGame = winner === null

  const accent = youWon
    ? "var(--gold)"
    : wallGame
      ? "var(--felt-divider)"
      : "var(--tile-navy)"
  const heading = youWon
    ? "Mahjong! 🤪"
    : wallGame
      ? "Wall game ☹️"
      : "Hand lost"
  const sub = youWon
    ? "You completed a winning hand."
    : wallGame
      ? "The wall ran out before anyone won."
      : "Another player declared Mahjong first."

  return (
    <div
      className="flex items-center gap-4 bg-paper border border-solid border-hairline rounded-md mb-4 px-[22px] py-[18px]"
      // Left accent bar color is win/loss/wall dependent — dynamic, stays inline.
      style={{ borderLeftWidth: 6, borderLeftColor: accent }}
    >
      <div>
        <div className="font-ui text-[22px] font-extrabold tracking-[-0.01em]">
          {heading}
        </div>
        <div className="font-ui text-[14px] font-medium text-ink-soft mt-0.5">
          {sub} Start a new game from the top bar to play again.
        </div>
      </div>
    </div>
  )
}
