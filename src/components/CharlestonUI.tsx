import { useEffect, useRef } from "react"
import { useMahjStore } from "../store"
import { passDirection, passTarget } from "../game/charleston"
import {
  captureCharlestonFlight,
  playCharlestonFlight,
} from "../store/charlestonFlight"

const PASS_LABEL: Record<string, string> = {
  firstRight: "First Right",
  firstAcross: "First Across",
  firstLeft: "First Left",
  secondLeft: "Second Left",
  secondAcross: "Second Across",
  secondRight: "Second Right",
  courtesy: "Courtesy · With West",
}

// Gold prompt heading + its body copy. Both are specific to the Charleston
// panel—the felt-wide atoms (.felt-label / .felt-note) are a different recipe.
const EYEBROW =
  "font-ui text-[14px] font-semibold uppercase tracking-[0.08em] text-gold"
const BODY = "font-ui text-[13px] font-semibold text-felt-ink"

const plural = (n: number) => (n === 1 ? "tile" : "tiles")

export function CharlestonUI({
  nudge = 0,
}: {
  /** Bumped when the human taps a tile during a decision prompt. */
  nudge?: number
}): React.ReactElement {
  const charleston = useMahjStore((s) => s.charleston)
  const selections = charleston.selections.east
  const clearSelection = useMahjStore((s) => s.clearSelection)
  const submit = useMahjStore((s) => s.submitCharlestonSelection)
  const runBotsAll = useMahjStore((s) => s.runBotCharlestonForAll)
  const advance = useMahjStore((s) => s.advanceCharleston)
  const agreeSecond = useMahjStore((s) => s.agreeSecondCharleston)
  const setBlindChoice = useMahjStore((s) => s.setBlindChoice)
  const setCourtesyOffer = useMahjStore((s) => s.setCourtesyOffer)
  const proposeCourtesy = useMahjStore((s) => s.proposeCourtesyCount)
  const confirmCourtesy = useMahjStore((s) => s.confirmCourtesy)
  const eastRack = useMahjStore((s) => s.players.east.rack)
  const courtesyOffers = charleston.courtesyOffers

  // Resolve currently-selected ids to Tile objects for the flight animation.
  // Blind-pass picks live in the face-down pool, not the rack.
  const blindPool = charleston.blindPool ?? []
  const selectedTiles = () =>
    [...eastRack, ...blindPool].filter((t) => selections.includes(t.id))

  // Replay the shake each time `nudge` changes. Resetting the animation to
  // 'none' + forcing a reflow restarts it even mid-run.
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!nudge) return
    const el = rowRef.current
    if (!el) return
    el.style.animation = "none"
    void el.offsetWidth
    el.style.animation = "draw-nudge 500ms ease"
  }, [nudge])

  if (charleston.pass === null && charleston.secondCharlestonAgreed === null) {
    // Between first and second—bots agreed, waiting on the human.
    return (
      <div className="flex flex-col gap-2.5">
        <div className={EYEBROW}>Charleston</div>
        <div className={BODY}>
          First Charleston complete. Continue with a second Charleston?
        </div>
        <div ref={rowRef} className="flex gap-2.5">
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => agreeSecond(true)}
          >
            Yes, second Charleston
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => agreeSecond(false)}
          >
            No, skip to courtesy
          </button>
        </div>
      </div>
    )
  }
  if (charleston.pass === null && charleston.secondCharlestonAgreed === false) {
    // A computer player declined the optional second Charleston. Per the rules
    // it only takes one decline to skip it—make that clear to the human.
    const decliners = charleston.secondDecliners ?? []
    const names = decliners.map(
      (seat) => seat[0]!.toUpperCase() + seat.slice(1),
    )
    const who =
      names.length === 0
        ? "A computer player"
        : names.length === 1
          ? names[0]!
          : names.length === 2
            ? `${names[0]} and ${names[1]}`
            : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`
    return (
      <div className="flex flex-col gap-2.5">
        <div className={EYEBROW}>Charleston</div>
        <div className={BODY}>{who} declined the second Charleston.</div>
        <div ref={rowRef}>
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => agreeSecond(false)}
          >
            Continue to courtesy pass
          </button>
        </div>
      </div>
    )
  }

  const pass = charleston.pass
  if (!pass) return <></>

  // ---- Courtesy pass: negotiate a count with West, then select tiles ----
  if (pass === "courtesy") {
    const step = charleston.courtesyStep ?? "choose"
    const agreed = charleston.courtesyAgreedCount

    if (step === "choose") {
      return (
        <div className="flex flex-col gap-3">
          <div className={EYEBROW}>Courtesy Pass · East ↔ West</div>
          <div className={BODY}>
            How many tiles would you like to exchange with West? You'll pass and
            receive the greatest number of tiles you agree on.
          </div>
          <div ref={rowRef} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn px-[14px] py-[6px] ${
                    courtesyOffers.east === n ? "btn-gold" : "btn-ghost"
                  }`}
                  onClick={() => setCourtesyOffer("east", n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => proposeCourtesy(courtesyOffers.east)}
              >
                {courtesyOffers.east === 0
                  ? "Skip courtesy pass"
                  : `Propose ${courtesyOffers.east}`}
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (step === "confirm") {
      return (
        <div className="flex flex-col gap-3">
          <div className={EYEBROW}>Courtesy Pass · East ↔ West</div>
          <div className={BODY}>
            {agreed > 0
              ? `West can only courtesy pass ${agreed} ${plural(agreed)}. Continue with ${agreed}?`
              : `West doesn't want to courtesy pass any tiles.`}
          </div>
          <div ref={rowRef} className="flex gap-2.5">
            {agreed > 0 && (
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => confirmCourtesy(true)}
              >
                Yes, exchange {agreed}
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => confirmCourtesy(false)}
            >
              Decline courtesy
            </button>
          </div>
        </div>
      )
    }

    // step === 'select'
    const canSubmit = selections.length === agreed
    const doCourtesyPass = () => {
      // Capture positions before the pass mutates the rack, then float clones.
      const captured = captureCharlestonFlight(selectedTiles(), "west")
      advance()
      void playCharlestonFlight(captured)
    }
    return (
      <div className="flex flex-col gap-3">
        <div className={EYEBROW}>Courtesy Pass · East ↔ West</div>
        <div className={BODY}>
          Select {agreed} {plural(agreed)} to pass to WEST ·{" "}
          <span className="mono text-gold">
            {selections.length}/{agreed}
          </span>{" "}
          selected
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => clearSelection("east")}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn-gold"
            onClick={doCourtesyPass}
            disabled={!canSubmit}
          >
            Pass
          </button>
        </div>
      </div>
    )
  }

  // ---- First / second Charleston: always exactly 3 tiles ----
  const target = passTarget("east", pass)
  const direction = passDirection(pass)

  // Opt in to the blind pass before any tile can be selected. Declining
  // reveals the face-down tiles into the rack and this pass proceeds normally.
  if (blindPool.length > 0 && charleston.blindChoice == null) {
    return (
      <div className="flex flex-col gap-3">
        <div className={EYEBROW}>{PASS_LABEL[pass]}</div>
        <div className={BODY}>
          Would you like to blind pass? You can select up to 3 tiles.
        </div>
        <div ref={rowRef} className="flex gap-2.5">
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => setBlindChoice(true)}
          >
            Yes, blind
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setBlindChoice(false)}
          >
            No, rack them
          </button>
        </div>
      </div>
    )
  }

  const doPass = () => {
    // Capture tile positions before the pass mutates the rack, then float the
    // clones toward the recipient seat. Blind picks fly face-down.
    const captured = captureCharlestonFlight(
      selectedTiles(),
      target,
      new Set(blindPool.map((t) => t.id)),
    )
    submit("east", selections)
    runBotsAll()
    advance()
    void playCharlestonFlight(captured)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={EYEBROW}>{PASS_LABEL[pass]}</div>
      <div className={BODY}>
        Pass {direction} to {target.toUpperCase()} ·{" "}
        {selections.length > 3 ? (
          <span className="text-[13px] font-semibold text-suit-red">
            Only select three tiles
          </span>
        ) : (
          <span className="mono text-gold">{selections.length}/3 selected</span>
        )}
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => clearSelection("east")}
        >
          Clear
        </button>
        <button
          type="button"
          className="btn btn-gold"
          onClick={doPass}
          disabled={selections.length !== 3}
        >
          Pass tiles
        </button>
      </div>
    </div>
  )
}
