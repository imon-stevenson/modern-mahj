import type { NMJLHand } from "../game/hands/schema"
import { handTileColors, parseHandPattern, patternColorRuns } from "./cardPattern"

// Render a hand's tile pattern with each tile colored by its suit, followed by
// the muted "(… suits)" note. The " — …" explanation is not shown.
export function HandPattern({ hand }: { hand: NMJLHand }): React.ReactElement {
  const { pattern, note } = parseHandPattern(hand.description)
  const runs = patternColorRuns(pattern, handTileColors(hand.groups))

  return (
    <div style={{ font: "700 14px var(--font-ui)", letterSpacing: "0.02em" }}>
      {runs.map((r, i) => (
        <span key={i} style={{ color: r.color ?? undefined }}>
          {r.text}
        </span>
      ))}
      {note && (
        <span
          style={{
            marginLeft: 8,
            font: "500 12px var(--font-ui)",
            color: "var(--ink-faint)",
          }}
        >
          {note}
        </span>
      )}
    </div>
  )
}
