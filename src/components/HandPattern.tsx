import type { NMJLHand } from "../game/hands/schema"
import {
  handTileColors,
  parseHandPattern,
  patternColorRuns,
} from "./cardPattern"

// Render a hand's tile pattern with each tile colored by its suit, followed by
// the muted "(… suits)" note. The "—…" explanation is not shown.
export function HandPattern({ hand }: { hand: NMJLHand }): React.ReactElement {
  const { pattern, note } = parseHandPattern(hand.description)
  const runs = patternColorRuns(pattern, handTileColors(hand.groups))

  return (
    <div className="font-ui text-[14px] font-bold tracking-[0.02em]">
      {runs.map((r, i) => (
        <span key={i} style={{ color: r.color ?? undefined }}>
          {r.text}
        </span>
      ))}
      {note && (
        <span className="ml-2 font-ui text-[12px] font-medium text-ink-faint">
          {note}
        </span>
      )}
    </div>
  )
}
