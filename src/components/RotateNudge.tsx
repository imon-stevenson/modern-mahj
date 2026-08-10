import { useEffect, useState } from "react"

// Query matches only a phone held in portrait: a touch device (coarse pointer),
// portrait orientation, and phone-width (<=540px in portrait excludes tablets).
const PHONE_PORTRAIT = "(orientation: portrait) and (pointer: coarse) and (max-width: 540px)"
const NUDGE_MS = 5000

// Transient overlay nudging phone users in portrait to rotate to landscape.
// Auto-dismisses after ~5s; re-shows each time the user re-enters portrait.
export function RotateNudge(): React.ReactElement | null {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia(PHONE_PORTRAIT)
    let timer = 0

    const update = () => {
      window.clearTimeout(timer)
      if (mq.matches) {
        setShow(true)
        timer = window.setTimeout(() => setShow(false), NUDGE_MS)
      } else {
        setShow(false)
      }
    }

    update()
    // Modern browsers use addEventListener; older Safari uses addListener.
    if (mq.addEventListener) mq.addEventListener("change", update)
    else mq.addListener(update)
    return () => {
      window.clearTimeout(timer)
      if (mq.removeEventListener) mq.removeEventListener("change", update)
      else mq.removeListener(update)
    }
  }, [])

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label="Rotate your phone to landscape"
      onClick={() => setShow(false)}
      className="fixed inset-0 z-[1000] bg-felt text-felt-ink flex flex-col items-center justify-center text-center gap-6 p-8"
      // Entrance animation isn't expressible as a utility (custom keyframes).
      style={{ animation: "rotate-nudge-in 240ms ease" }}
    >
      <svg
        className="rotate-nudge-icon"
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
      >
        {/* phone body (portrait), animated to hint a rotation to landscape */}
        <g className="rotate-nudge-phone">
          <rect
            x="42"
            y="28"
            width="36"
            height="64"
            rx="7"
            fill="var(--paper)"
            stroke="var(--gold)"
            strokeWidth="3"
          />
          <rect x="54" y="84" width="12" height="3" rx="1.5" fill="var(--gold)" />
        </g>
        {/* curved rotation arrows around the phone */}
        <path
          d="M92 44 A38 38 0 0 1 98 78"
          stroke="var(--gold)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M98 78 l-6 -3 l7 -5 z" fill="var(--gold)" />
        <path
          d="M28 76 A38 38 0 0 1 22 42"
          stroke="var(--gold)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M22 42 l6 3 l-7 5 z" fill="var(--gold)" />
      </svg>

      <div>
        <div className="font-ui text-[24px] font-extrabold tracking-[-0.01em]">
          Rotate your phone
        </div>
        <div className="mt-2 font-ui text-[15px] font-medium text-felt-ink-soft">
          This game plays best in landscape.
        </div>
      </div>

      <div className="font-ui text-[12px] font-semibold text-felt-ink-mute">
        Tap to dismiss
      </div>
    </div>
  )
}
