import { useEffect, useRef, useState } from "react"
import { isCharlestonDecisionPrompt, useMahjStore } from "../store"
import { PlayerRack } from "./PlayerRack"
import { OpponentRack } from "./OpponentRack"
import { DiscardPile } from "./DiscardPile"
import { CharlestonUI } from "./CharlestonUI"
import { CallControl } from "./CallControl"
import { CharlestonFlightOverlay } from "./CharlestonFlightOverlay"
import { DiscardFlightOverlay } from "./DiscardFlightOverlay"
import { JokerSwapFlightOverlay } from "./JokerSwapFlightOverlay"
import { GameOverBanner } from "./GameOverBanner"
import { useDiscardFlight } from "../hooks/useDiscardFlight"
import { useIsDesktop } from "../hooks/useIsDesktop"
import { attemptJokerSwap, useJokerSwapUi } from "../store/jokerSwapUi"
import { CARD_YEARS } from "../game/hands/loader"
import type { Difficulty } from "../game/types"

export function Board(): React.ReactElement {
  useDiscardFlight()
  const phase = useMahjStore((s) => s.phase)
  const players = useMahjStore((s) => s.players)
  const currentSeat = useMahjStore((s) => s.currentSeat)
  const discards = useMahjStore((s) => s.discards)
  const wall = useMahjStore((s) => s.wall)
  const charleston = useMahjStore((s) => s.charleston)
  const toggle = useMahjStore((s) => s.toggleTileSelection)
  const humanDiscard = useMahjStore((s) => s.humanDiscard)
  const humanDraw = useMahjStore((s) => s.humanDraw)
  const eastRackOrder = useMahjStore((s) => s.eastRackOrder)
  const reorderEastRack = useMahjStore((s) => s.reorderEastRack)
  const resetEastRackOrder = useMahjStore((s) => s.resetEastRackOrder)
  const lastAction = useMahjStore((s) => s.lastAction)
  const paused = useMahjStore((s) => s.paused)
  const resumeGame = useMahjStore((s) => s.resumeGame)
  const cardYear = useMahjStore((s) => s.cardYear)
  const startGameWithCard = useMahjStore((s) => s.startGameWithCard)
  const setCardYear = useMahjStore((s) => s.setCardYear)
  const difficulty = useMahjStore((s) => s.difficulty)
  const setDifficulty = useMahjStore((s) => s.setDifficulty)

  // Bumped whenever the human clicks somewhere on the board while they still
  // owe a draw—replays the "Draw tile" button's attention shake.
  const [drawNudge, setDrawNudge] = useState(0)

  // Bumped whenever the human taps a rack tile while a Charleston decision
  // prompt is up—replays the prompt buttons' attention shake.
  const [charlestonNudge, setCharlestonNudge] = useState(0)

  // Transient rejection when the human taps a joker during the Charleston
  const [jokerReject, setJokerReject] = useState<{ id: string } | null>(null)
  const jokerRejectTimer = useRef<number | null>(null)
  const rejectJoker = (id: string) => {
    if (jokerRejectTimer.current) window.clearTimeout(jokerRejectTimer.current)
    setJokerReject({ id })
    jokerRejectTimer.current = window.setTimeout(
      () => setJokerReject(null),
      2000,
    )
  }
  useEffect(() => {
    return () => {
      if (jokerRejectTimer.current)
        window.clearTimeout(jokerRejectTimer.current)
    }
  }, [])

  // The tile the human just drew stays pinned to the far right of their rack
  // until they discard (turn ends) or drag it into place.
  const drawnTileId =
    lastAction?.kind === "draw" && lastAction.seat === "east"
      ? lastAction.tileId
      : null

  // Escape cancels an in-progress joker-swap selection. On desktop, "d" draws a
  // tile when it's your turn (humanDraw self-guards to the right moment).
  const isDesktop = useIsDesktop()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useJokerSwapUi.getState().clearSwap()
        return
      }
      if (!isDesktop) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      const tag = el?.tagName
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (el as HTMLElement | null)?.isContentEditable
      ) {
        return
      }
      if (e.key.toLowerCase() === "d") humanDraw()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isDesktop, humanDraw])

  if (phase === "setup") {
    return (
      <div
        style={{
          background: "var(--felt)",
          borderRadius: "var(--radius-lg)",
          padding: "64px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "48px",
        }}
      >
        <div
          style={{
            color: "var(--felt-ink-soft)",
            font: "500 16px var(--font-ui)",
            paddingTop: "24px",
          }}
        >
          No game in progress. Start one from the top bar to take your seat at
          the table.
        </div>
      </div>
    )
  }

  if (phase === "chooseCard") {
    // Card picker drawn within the mat boundary before every game. The default
    // (most recently used / 2026) is the primary button.
    return (
      <div
        style={{
          background: "var(--felt)",
          borderRadius: "var(--radius-lg)",
          padding: "56px 40px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
        }}
      >
        <div
          style={{
            font: "800 22px var(--font-ui)",
            color: "var(--felt-ink)",
            letterSpacing: "-0.01em",
          }}
        >
          Which card are you playing with?
        </div>
        <div
          style={{
            font: "500 14px var(--font-ui)",
            color: "var(--felt-ink-soft)",
          }}
        >
          Pick the NMJL card for this game—it can't change once you start!
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 14,
            marginTop: 6,
          }}
        >
          {CARD_YEARS.map((year) => (
            <button
              key={year}
              type="button"
              className={year === cardYear ? "btn btn-gold" : "btn btn-outline"}
              style={{ padding: "12px 22px", font: "800 15px var(--font-ui)" }}
              onClick={() => setCardYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 14,
            marginTop: 6,
          }}
        >
          {["Beginner", "Intermediate", "Expert"].map((level) => (
            <button
              key={level}
              type="button"
              className={
                level.toLowerCase() === difficulty
                  ? "btn btn-gold"
                  : "btn btn-outline"
              }
              style={{ padding: "12px 14px", font: "800 15px var(--font-ui)" }}
              onClick={() => setDifficulty(level.toLowerCase() as Difficulty)}
            >
              {level}
            </button>
          ))}
        </div>
        <button
          type="button"
          autoFocus
          className="btn btn-green"
          style={{
            marginTop: 6,
            padding: "15px 52px",
            font: "800 17px var(--font-ui)",
            letterSpacing: "0.02em",
            boxShadow: "0 8px 22px oklch(0.22 0.05 255 / 0.4)",
          }}
          onClick={() => startGameWithCard(cardYear)}
        >
          Begin →
        </button>
      </div>
    )
  }

  const isCharleston = phase === "charleston"
  const isPlay = phase === "play"
  const eastIsCurrent = isPlay && currentSeat === "east"
  const selectedIds = charleston.selections.east
  // Waiting on a button answer (second Charleston / courtesy negotiation)—the
  // rack is inert until the human decides.
  const charlestonPrompt = isCharleston && isCharlestonDecisionPrompt(charleston)

  const eastTotal =
    players.east.rack.length +
    players.east.exposures.reduce((n, e) => n + e.tiles.length, 0)
  const needsDraw = eastIsCurrent && eastTotal === 13

  const onEastTile = (tileId: string) => {
    // If a joker swap is in progress, this rack tile is the offered tile.
    if (attemptJokerSwap(tileId)) return
    if (isCharleston) {
      // A decision prompt is up—swallow the tap and shake its buttons instead.
      if (charlestonPrompt) {
        setCharlestonNudge((n) => n + 1)
        return
      }
      // Jokers may never be passed in the Charleston—reject the tap.
      const tile = players.east.rack.find((t) => t.id === tileId)
      if (tile?.kind === "joker") {
        rejectJoker(tileId)
        return
      }
      toggle(tileId)
    } else if (eastIsCurrent && !needsDraw) humanDiscard(tileId)
    // When a draw is owed, clicking a tile does nothing here; the board-level
    // handler below nudges the Draw button instead.
  }

  // While the human owes a draw, any click that isn't the Draw button itself
  // shakes the Draw button to point them at it.
  const onBoardClick = (e: React.MouseEvent) => {
    if (!needsDraw) return
    if ((e.target as HTMLElement).closest("[data-draw-btn]")) return
    setDrawNudge((n) => n + 1)
  }

  const actionSlot = isCharleston ? (
    <CharlestonUI nudge={charlestonNudge} />
  ) : isPlay ? (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
        rowGap: 10,
      }}
    >
      <PlayActions
        eastIsCurrent={eastIsCurrent}
        needsDraw={needsDraw}
        currentSeat={currentSeat}
        onDraw={humanDraw}
        nudge={drawNudge}
        isDesktop={isDesktop}
      />
      <CallControl />
    </div>
  ) : null

  return (
    <div>
      <GameOverBanner />
      <div
        className="board-grid"
        onClick={onBoardClick}
        style={{
          position: "relative",
          background: "var(--felt)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
        }}
      >
        {paused && (
          // Opaque overlay covering only the mat—the header, Card drawer, and
          // Rules panel (outside the board) stay visible and usable.
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              borderRadius: "var(--radius-lg)",
              background:
                "linear-gradient(160deg, oklch(0.24 0.05 258), oklch(0.19 0.05 258))",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              textAlign: "center",
              padding: 24,
            }}
          >
            <div
              style={{
                font: "800 26px var(--font-ui)",
                color: "var(--felt-ink)",
              }}
            >
              Game Paused
            </div>
            <div
              style={{
                font: "500 14px var(--font-ui)",
                color: "var(--felt-ink-soft)",
                maxWidth: 360,
              }}
            >
              The game is on hold. Resume when you're ready.
            </div>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => resumeGame()}
            >
              Resume game
            </button>
          </div>
        )}
        <div
          style={{
            gridArea: "west",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {/* Centered box with open felt on either side, matching N/S width. */}
          <div id="seat-west" style={{ width: "100%", maxWidth: 330 }}>
            <OpponentRack
              seat="west"
              player={players.west}
              isCurrent={currentSeat === "west"}
              centerTiles
            />
          </div>
        </div>
        <div id="seat-north" style={{ gridArea: "north" }}>
          <OpponentRack
            seat="north"
            player={players.north}
            isCurrent={currentSeat === "north"}
          />
        </div>
        <div id="seat-south" style={{ gridArea: "south" }}>
          <OpponentRack
            seat="south"
            player={players.south}
            isCurrent={currentSeat === "south"}
          />
        </div>

        <div
          style={{
            gridArea: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 22,
            padding: "8px 0",
          }}
        >
          <WallIndicator remaining={wall.length} />
          <DiscardPile discards={discards} />
        </div>

        <div id="seat-east" style={{ gridArea: "east" }}>
          <PlayerRack
            player={players.east}
            selectedIds={isCharleston ? selectedIds : []}
            onTileClick={(t) => onEastTile(t.id)}
            // Enabled on the human's turn even before drawing, so a click on a
            // tile still registers (and nudges the Draw button) rather than
            // being swallowed by a disabled button.
            disabled={!isCharleston && !eastIsCurrent}
            active={eastIsCurrent || isCharleston}
            actionSlot={actionSlot}
            rackOrder={eastRackOrder}
            onReorder={reorderEastRack}
            onResetOrder={resetEastRackOrder}
            pinnedTileId={drawnTileId}
            shakeTileId={jokerReject?.id ?? null}
            notice={
              jokerReject
                ? "You can't pass Jokers during the Charleston."
                : null
            }
          />
        </div>
      </div>

      <CharlestonFlightOverlay />
      <DiscardFlightOverlay />
      <JokerSwapFlightOverlay />
    </div>
  )
}

function WallIndicator({
  remaining,
}: {
  remaining: number
}): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          font: "700 11px var(--font-ui)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--felt-ink-mute)",
        }}
      >
        Wall
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 20,
              height: 28,
              borderRadius: 4,
              background:
                "linear-gradient(155deg, oklch(0.36 0.07 255), oklch(0.22 0.06 258))",
              border: "1px solid oklch(0.18 0.05 258)",
              opacity: remaining > i * (remaining / 8) ? 1 : 0.3,
            }}
          />
        ))}
      </div>
      <div
        className="mono"
        style={{ font: "600 12px var(--font-mono)", color: "var(--gold)" }}
      >
        {remaining} remaining
      </div>
    </div>
  )
}

function PlayActions({
  eastIsCurrent,
  needsDraw,
  currentSeat,
  onDraw,
  nudge,
  isDesktop,
}: {
  eastIsCurrent: boolean
  needsDraw: boolean
  currentSeat: string
  onDraw: () => void
  nudge: number
  isDesktop: boolean
}): React.ReactElement {
  const btnRef = useRef<HTMLButtonElement>(null)

  // Replay the shake each time `nudge` changes (a mis-click elsewhere). Resetting
  // the animation to 'none' + forcing a reflow restarts it even mid-run.
  useEffect(() => {
    if (!nudge) return
    const el = btnRef.current
    if (!el) return
    el.style.animation = "none"
    void el.offsetWidth
    el.style.animation = "draw-nudge 500ms ease"
  }, [nudge])

  if (!eastIsCurrent) {
    const name = currentSeat.charAt(0).toUpperCase() + currentSeat.slice(1)
    return (
      <div
        style={{
          font: "600 13px var(--font-ui)",
          color: "var(--felt-ink-mute)",
        }}
      >
        Waiting for {name} to play…
      </div>
    )
  }
  if (needsDraw) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          ref={btnRef}
          data-draw-btn="true"
          type="button"
          className="btn btn-gold"
          onClick={onDraw}
        >
          Draw
          <div style={{ fontSize: "8px", opacity: 0.75 }}>
            {isDesktop ? ' (Hint: Press "d")' : ""}
          </div>
        </button>
        <span
          style={{
            font: "600 12px var(--font-ui)",
            color: "var(--felt-ink-mute)",
          }}
        >
          Draw from the wall to begin your turn.
        </span>
      </div>
    )
  }
  return (
    <div
      style={{ font: "600 13px var(--font-ui)", color: "var(--felt-ink-soft)" }}
    >
      Click a tile to discard it.
    </div>
  )
}
