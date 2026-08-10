import { useEffect, useState } from "react"
import { useMahjStore } from "../store"

// How long the celebration rains for, and what falls.
const RAIN_MS = 6000
const EMOJIS = ["🥳", "👏"] as const
const PIECE_COUNT = 72

type Piece = {
  id: number
  left: number // vw %
  size: number // px
  dur: number // seconds
  delay: number // seconds
  drift: number // vw (horizontal wander)
  rot: number // deg (spin)
  emoji: string
}

// Math.random is fine here: this is purely decorative UI, not game/bot logic
// (which must use the seeded RNG under src/game).
function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const dur = 2.6 + Math.random() * 1.6 // 2.6–4.2s
    return {
      id: i,
      left: Math.random() * 100,
      size: 22 + Math.random() * 26, // 22–48px
      dur,
      delay: Math.random() * (RAIN_MS / 1000 - dur), // finishes within RAIN_MS
      drift: (Math.random() * 2 - 1) * 12, // -12–12vw
      rot: (Math.random() * 2 - 1) * 540, // -540–540deg
      emoji: EMOJIS[i % EMOJIS.length]!,
    }
  })
}

// Full-screen, non-interactive overlay that rains 🥳👏 when the human (East)
// declares Mahjong. Auto-clears after ~6s and honours reduced-motion.
export function EmojiRain(): React.ReactElement | null {
  const phase = useMahjStore((s) => s.phase)
  const winner = useMahjStore((s) => s.winner)
  const youWon = phase === "ended" && winner === "east"
  const [pieces, setPieces] = useState<Piece[] | null>(null)

  useEffect(() => {
    if (!youWon) return
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches
    if (reduce) return // the game-over banner already announces the win
    let timer = 0
    const start = () => {
      setPieces(makePieces())
      timer = window.setTimeout(() => setPieces(null), RAIN_MS)
    }
    start()
    return () => window.clearTimeout(timer)
  }, [youWon])

  // Gate on youWon too so a new game started mid-celebration clears the rain.
  if (!youWon || !pieces) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[2000] pointer-events-none overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            lineHeight: 1,
            userSelect: "none",
            willChange: "transform, opacity",
            animation: `emoji-rain-fall ${p.dur}s linear ${p.delay}s forwards`,
            ["--drift" as string]: `${p.drift}vw`,
            ["--rot" as string]: `${p.rot}deg`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  )
}
