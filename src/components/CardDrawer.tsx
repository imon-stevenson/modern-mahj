import { Fragment, useEffect, useMemo, useState } from "react"
import { useMahjStore } from "../store"
import { HandPattern } from "./HandPattern"

const DRAWER_Z = 30

// "The Card" — a scannable reference of the NMJL hands. Shown as a right-side
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
        style={{
          position: "fixed",
          right: 0,
          top: "10%",
          zIndex: DRAWER_Z,
          writingMode: "vertical-rl",
          padding: "16px 8px",
          border: "none",
          borderRadius: "12px 0 0 12px",
          background: "var(--gold)",
          color: "var(--gold-ink)",
          font: "800 12px var(--font-ui)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          boxShadow: "-5px 6px 18px oklch(0.22 0.05 255 / 0.28)",
          cursor: "pointer",
        }}
      >
        The Card
      </button>
    )
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: bounds.top,
        bottom: bounds.bottom,
        width: "min(400px, 92vw)",
        zIndex: DRAWER_Z,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--paper)",
        border: "1px solid var(--hairline)",
        borderRight: "none",
        borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
        boxShadow: "-14px 0 44px oklch(0.22 0.05 255 / 0.3)",
        animation: "card-drawer-slide 220ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 2 }}>
            The Card
          </div>
          <div
            style={{
              font: "800 16px var(--font-ui)",
              color: "var(--tile-navy)",
            }}
          >
            {cardYear} Card{" "}
            <span
              className="mono"
              style={{
                font: "600 12px var(--font-mono)",
                color: "var(--ink-faint)",
              }}
            >
              · {hands.length} hands
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          aria-label="Close the card"
          style={{ marginLeft: "auto", padding: "6px 12px", lineHeight: 1 }}
          onClick={onClose}
        >
          ✕ Close
        </button>
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          overflowY: "auto",
          flex: 1,
        }}
      >
        {sections.map((group) => (
          <Fragment key={group.section}>
            <li
              role="presentation"
              style={{
                position: "sticky",
                top: 0,
                zIndex: 1,
                padding: "10px 18px",
                background: "var(--paper)",
                borderBottom: "1px solid var(--hairline)",
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                font: "800 13px var(--font-ui)",
                color: "var(--tile-navy)",
              }}
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
                  style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--hairline)",
                    cursor: "pointer",
                    background: on ? "var(--hand-highlight)" : "transparent",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      font: "600 11px var(--font-ui)",
                      color: "var(--ink-faint)",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      L{h.line}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        font: "700 10px var(--font-ui)",
                        padding: "2px 6px",
                        borderRadius: 6,
                        background: h.closed
                          ? "oklch(0.32 0.07 255 / 0.12)"
                          : "oklch(0.5 0.14 150 / 0.14)",
                        color: h.closed
                          ? "var(--tile-navy)"
                          : "var(--suit-green)",
                      }}
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
