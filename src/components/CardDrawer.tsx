import { Fragment, useEffect, useMemo, useState } from "react"
import { useMahjStore } from "../store"
import { HandPattern } from "./HandPattern"

// "The Card"—a scannable reference of the NMJL hands. Shown as a right-side
// drawer with a pull tab when closed. Its height is bounded to stop above the
// human's rack (measured from `#seat-east`) so the rack stays visible while the
// card is open. Per product decision we show the pattern only, never points.
export function CardDrawer({
  open,
  onOpen,
  onClose,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
}): React.ReactElement {
  const load = useMahjStore((s) => s.loadHandsSafe)
  const cardYear = useMahjStore((s) => s.cardYear)
  const highlightedHands = useMahjStore((s) => s.highlightedHands)
  const toggleHandHighlight = useMahjStore((s) => s.toggleHandHighlight)
  const hands = useMemo(() => load(cardYear), [load, cardYear])

  // Group consecutive hands by section (the card JSON is already section-ordered)
  // so each section can get its own heading.
  const sections = useMemo(() => {
    const groups: { section: string; hands: typeof hands }[] = []
    for (const h of hands) {
      const last = groups[groups.length - 1]
      if (last && last.section === h.section) last.hands.push(h)
      else groups.push({ section: h.section, hands: [h] })
    }
    return groups
  }, [hands])

  // Drawer top = just below the sticky header; bottom = just above the rack, so
  // the rack remains visible. Recomputed on scroll/resize while open.
  const [bounds, setBounds] = useState<{ top: number; bottom: number }>({
    top: 76,
    bottom: 16,
  })

  useEffect(() => {
    if (!open) return
    let raf = 0
    const measure = () => {
      raf = 0
      const gap = 12
      const header = document.getElementById("app-header")
      const rack = document.getElementById("seat-east")
      const top = header ? header.getBoundingClientRect().bottom + gap : 72
      const rackTop = rack
        ? rack.getBoundingClientRect().top
        : window.innerHeight
      const bottom = Math.max(gap, window.innerHeight - rackTop + gap)
      setBounds({ top, bottom })
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open the card"
        className="fixed right-0 top-[10%] px-3 z-30 [writing-mode:vertical-rl] px-2 py-4 border-none rounded-[12px_0_0_12px] bg-gold text-gold-ink font-ui text-[12px] font-extrabold tracking-[0.12em] uppercase shadow-[-5px_6px_18px_oklch(0.22_0.05_255_/_0.28)] cursor-pointer"
      >
        The Card
      </button>
    )
  }

  return (
    <div
      className="fixed right-0 w-[min(400px,92vw)] z-30 flex flex-col overflow-hidden bg-paper border border-solid border-hairline border-r-0 rounded-[var(--radius-md)_0_0_var(--radius-md)] shadow-[-14px_0_44px_oklch(0.22_0.05_255_/_0.3)]"
      // Bounds are measured from the header/rack; the slide-in uses custom
      // keyframes. Both stay inline.
      style={{
        top: bounds.top,
        bottom: bounds.bottom,
        animation: "card-drawer-slide 220ms ease",
      }}
    >
      <div className="flex items-center gap-2.5 px-[18px] py-[14px] border-b border-solid border-hairline">
        <div>
          <div className="eyebrow mb-0.5">The Card</div>
          <div className="font-ui text-[16px] font-extrabold text-tile-navy">
            {cardYear} Card{" "}
            <span className="mono text-[12px] text-ink-faint">
              · {hands.length} hands
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline ml-auto px-3 py-[6px] leading-none"
          aria-label="Close the card"
          onClick={onClose}
        >
          ✕ Close
        </button>
      </div>

      <ul className="list-none p-0 m-0 overflow-y-auto flex-1">
        {sections.map((group) => (
          <Fragment key={group.section}>
            <li
              role="presentation"
              className="sticky top-0 z-[1] px-[18px] py-2.5 bg-paper border-b border-solid border-hairline text-center uppercase tracking-[0.16em] font-ui text-[13px] font-extrabold text-tile-navy"
            >
              {group.section}
            </li>
            {group.hands.map((h) => {
              const on = highlightedHands.includes(h.id)
              const toggle = () => toggleHandHighlight(h.id)
              return (
                <li
                  key={h.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  title="Click to highlight this hand"
                  onClick={toggle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggle()
                    }
                  }}
                  className={`px-[18px] py-3 border-b border-solid border-hairline cursor-pointer ${
                    on ? "bg-hand-highlight" : "bg-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 font-ui text-[11px] font-semibold text-ink-faint mb-1">
                    <span className="uppercase tracking-[0.06em]">
                      L{h.line}
                    </span>
                    <span
                      className={`ml-auto font-ui text-[10px] font-bold px-1.5 py-[2px] rounded-[6px] ${
                        h.closed
                          ? "bg-[oklch(0.32_0.07_255_/_0.12)] text-tile-navy"
                          : "bg-[oklch(0.5_0.14_150_/_0.14)] text-suit-green"
                      }`}
                      title={
                        h.closed ? "Concealed hand" : "Exposed hand allowed"
                      }
                    >
                      {h.closed ? "CONCEALED" : "EXPOSED"}
                    </span>
                  </div>
                  <HandPattern hand={h} />
                </li>
              )
            })}
          </Fragment>
        ))}
      </ul>
    </div>
  )
}
