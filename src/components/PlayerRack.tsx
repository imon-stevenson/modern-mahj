import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { PlayerState, Tile } from "../game/types"
import { TileView } from "./Tile"
import { ExposureRow } from "./ExposureRow"
import { applyRackOrder, reorderIds } from "./rackOrder"

// Pointer must move this far before a press becomes a drag (vs a tap/click).
const DRAG_THRESHOLD_PX = 8
import { useJokerSwapUi } from "../store/jokerSwapUi"

// Hold + fade duration for the "new tile" highlight—keep in sync with the
// `tile-highlight` keyframe in index.css (5s hold + 1s fade).
const HIGHLIGHT_MS = 6000

const NO_IDS: ReadonlySet<string> = new Set()

// Tracks which rack tile ids were recently added (drawn or received in the
// Charleston) so they can be highlighted, then auto-cleared after the fade.
// The initial hand (first render) is treated as already-present, not new.
// `excludeIds` opts specific ids out of the highlight even though they're new
// to the rack—used for blind-pass tiles that were only ever hidden, not new.
function useNewTileHighlights(
  ids: string[],
  excludeIds?: ReadonlySet<string>,
): Set<string> {
  const seen = useRef<Set<string> | null>(null)
  const timers = useRef<Map<string, number>>(new Map())
  const [highlighted, setHighlighted] = useState<Set<string>>(() => new Set())
  const key = ids.join(",")
  // Callers memoize this by id, so it's referentially stable and safe as a
  // dependency; a change with no new ids just re-runs an empty diff.
  const exclude = excludeIds ?? NO_IDS

  useEffect(() => {
    const current = key ? key.split(",") : []
    if (seen.current === null) {
      seen.current = new Set(current)
      return
    }
    // Excluded ids still land in `seen` below, so they never highlight later.
    const added = current.filter(
      (id) => !seen.current!.has(id) && !exclude.has(id),
    )
    seen.current = new Set(current)
    if (added.length === 0) return

    setHighlighted((prev) => {
      const next = new Set(prev)
      added.forEach((id) => next.add(id))
      return next
    })
    added.forEach((id) => {
      const existing = timers.current.get(id)
      if (existing) window.clearTimeout(existing)
      const t = window.setTimeout(() => {
        setHighlighted((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        timers.current.delete(id)
      }, HIGHLIGHT_MS)
      timers.current.set(id, t)
    })
  }, [key, exclude])

  useEffect(() => {
    const timeouts = timers.current
    return () => timeouts.forEach((t) => window.clearTimeout(t))
  }, [])

  return highlighted
}

type Props = {
  player: PlayerState
  selectedIds: string[]
  onTileClick: (tile: Tile) => void
  disabled?: boolean
  active?: boolean
  actionSlot?: ReactNode
  // Manual tile order (ids) and callbacks for drag-to-rearrange. When
  // rackOrder is null the tiles fall back to the default suit/number sort.
  rackOrder?: string[] | null
  onReorder?: (orderedIds: string[]) => void
  onResetOrder?: () => void
  // Id of the tile pinned to the far right of the rack (the freshly drawn tile).
  pinnedTileId?: string | null
  // Id of a tile to shake once (e.g. an illegal Charleston joker tap), and an
  // optional warning message to show beneath the rack while it's set.
  shakeTileId?: string | null
  notice?: string | null
  // Tiles received on the across pass, held face-down for the blind pass that
  // follows. Selectable like rack tiles, but never revealed or draggable.
  blindPool?: Tile[]
  onBlindTileClick?: (tile: Tile) => void
  // Only true once the player has opted into the blind pass. Until then the
  // face-down row stays hidden—they're still being asked whether they want it.
  blindPassActive?: boolean
  // Ids that rejoined the rack from the blind pool rather than arriving from
  // another player—kept out of the "just received" highlight.
  blindRevealed?: string[]
}

export function PlayerRack({
  player,
  selectedIds,
  onTileClick,
  disabled,
  active,
  actionSlot,
  rackOrder,
  onReorder,
  onResetOrder,
  pinnedTileId,
  shakeTileId,
  notice,
  blindPool,
  onBlindTileClick,
  blindPassActive,
  blindRevealed,
}: Props): React.ReactElement {
  // Once the player explicitly sorts, stop pinning the drawn tile right so it
  // merges into the sorted hand. Re-arms automatically on the next draw (new id).
  const [dismissedPinnedTileId, setDismissedPinnedTileId] = useState<
    string | null
  >(null)
  const activePinnedTileId =
    pinnedTileId && pinnedTileId !== dismissedPinnedTileId ? pinnedTileId : null

  const ordered = useMemo(
    () => applyRackOrder(player.rack, rackOrder, activePinnedTileId),
    [player.rack, rackOrder, activePinnedTileId],
  )
  const selected = new Set(selectedIds)
  const blind = blindPool ?? []
  // Face-down tiles are still yours—count them in the total.
  const total =
    player.rack.length +
    blind.length +
    player.exposures.reduce((n, e) => n + e.tiles.length, 0)

  const revealedKey = (blindRevealed ?? []).join(",")
  const revealedIds = useMemo(
    () => new Set(revealedKey ? revealedKey.split(",") : []),
    [revealedKey],
  )
  const highlighted = useNewTileHighlights(
    player.rack.map((t) => t.id),
    revealedIds,
  )

  // Joker-swap UI: highlight/shake/hide the offered rack tile during a swap.
  const swapPendingId = useJokerSwapUi((s) => s.pendingRackId)
  const swapShakeIds = useJokerSwapUi((s) => s.shakeIds)
  const swapHiddenIds = useJokerSwapUi((s) => s.hiddenIds)

  // Drag-to-reorder via Pointer Events (works with mouse AND touch, unlike the
  // HTML5 drag API which never fires on phones). A press becomes a drag only
  // after moving past a small threshold; otherwise it's a tap and falls through
  // to the tile's onClick (discard/select).
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{
    tile: Tile
    x: number
    y: number
  } | null>(null)
  const dragStart = useRef<{
    id: string
    x: number
    y: number
    pointerId: number
    el: HTMLElement
  } | null>(null)
  const justDragged = useRef(false)

  const onPointerDown = (e: React.PointerEvent, tile: Tile) => {
    if (!onReorder) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    dragStart.current = {
      id: tile.id,
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      el: e.currentTarget as HTMLElement,
    }
  }

  const onPointerMove = (e: React.PointerEvent, tile: Tile) => {
    const start = dragStart.current
    if (!start || start.id !== tile.id) return
    if (dragId === null) {
      if (
        Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD_PX
      )
        return
      setDragId(start.id)
      try {
        start.el.setPointerCapture(start.pointerId)
      } catch {
        /* capture is best-effort */
      }
    }
    e.preventDefault()
    setGhost({ tile, x: e.clientX, y: e.clientY })
    const overEl = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-tile-id]")
    const id = overEl?.getAttribute("data-tile-id") ?? null
    setOverId(id && id !== start.id ? id : null)
  }

  const endDrag = (commit: boolean) => {
    const start = dragStart.current
    if (start && dragId !== null) {
      if (commit && overId && onReorder) {
        onReorder(
          reorderIds(
            ordered.map((t) => t.id),
            start.id,
            overId,
          ),
        )
      }
      justDragged.current = true // swallow the click that follows a drag
      try {
        start.el.releasePointerCapture(start.pointerId)
      } catch {
        /* ignore */
      }
    }
    dragStart.current = null
    setDragId(null)
    setOverId(null)
    setGhost(null)
  }

  const onRackClickCapture = (e: React.MouseEvent) => {
    if (justDragged.current) {
      justDragged.current = false
      e.stopPropagation()
      e.preventDefault()
    }
  }

  return (
    <div
      className={`bg-felt-panel-2 rounded-md px-[22px] py-[18px] border border-solid transition-[border-color,box-shadow] duration-[160ms] ease-[ease] ${
        active
          ? "border-gold shadow-[0_0_0_3px_oklch(0.75_0.13_80_/_0.16)]"
          : "border-felt-border shadow-none"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2 h-2 rounded-full ${
              active ? "bg-gold" : "bg-felt-divider"
            }`}
          />
          <span className="font-ui text-[14px] font-extrabold text-felt-ink">
            East · You
          </span>
          {active && (
            <span className="font-ui text-[11px] font-bold bg-gold text-gold-ink px-2 py-[3px] rounded-[20px]">
              YOUR TURN
            </span>
          )}
        </div>
        {notice && (
          <div
            role="alert"
            className="text-center font-ui text-[13px] font-bold text-gold-ink bg-gold rounded-sm px-4 py-1"
          >
            {notice}
          </div>
        )}
        <div className="flex items-center gap-3">
          {onResetOrder && (
            <button
              type="button"
              className="btn btn-ghost px-3 py-[5px] text-[11px] font-bold"
              onClick={() => {
                // Dismiss the drawn-tile pin so it sorts in with the rest.
                setDismissedPinnedTileId(pinnedTileId ?? null)
                onResetOrder?.()
              }}
              title="Sort tiles by suit and number"
            >
              Sort Tiles
            </button>
          )}
        </div>
      </div>

      {/* Tiles just handed to you, still face-down. Click any of them to send
          them straight on without looking (the Charleston "blind pass"). Only
          shown once the player has opted in; the tiles still count toward the
          total above while the question is up. */}
      {blindPassActive && blind.length > 0 && (
        <div className="flex flex-col items-center gap-1.5 pt-2">
          <div className="felt-label">Just Received · Blind Pass</div>
          {/* Wider than the rack's gap-1: selected tiles carry a gold ring
              (2px outline at 2px offset) that would otherwise collide. */}
          <div className="flex gap-2 mt-2">
            {blind.map((t) => (
              // data-tile-id anchors the flight animation's capture.
              <div key={t.id} data-tile-id={t.id}>
                <TileView
                  tile={t}
                  faceDown
                  width={52}
                  selected={selected.has(t.id)}
                  onClick={
                    onBlindTileClick ? () => onBlindTileClick(t) : undefined
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exposed sets sit above the rack, rotated to face the other players —
          slightly smaller than the rack tiles, upside-down from your POV. */}
      {player.exposures.length > 0 && (
        <div className="flex justify-center pt-2">
          <ExposureRow
            exposures={player.exposures}
            tileWidth={48}
            flip
            seat="east"
          />
        </div>
      )}

      <div className="flex justify-center flex-wrap pt-3">
        <div
          onClickCapture={onRackClickCapture}
          className="flex gap-1 flex-wrap justify-center"
        >
          {ordered.map((t) => (
            <div
              key={t.id}
              data-tile-id={t.id}
              onPointerDown={(e) => onPointerDown(e, t)}
              onPointerMove={(e) => onPointerMove(e, t)}
              onPointerUp={() => endDrag(true)}
              onPointerCancel={() => endDrag(false)}
              className="cursor-grab rounded-[9px] transition-[opacity,box-shadow] duration-[120ms] ease-[ease] touch-none"
              // Everything below is computed per tile.
              style={{
                opacity: dragId === t.id ? 0.35 : 1,
                visibility: swapHiddenIds.includes(t.id) ? "hidden" : "visible",
                boxShadow:
                  swapPendingId === t.id
                    ? "0 0 0 3px var(--swap-blue), 0 0 12px 2px var(--swap-blue)"
                    : overId === t.id && dragId && dragId !== t.id
                      ? "0 0 0 2px var(--gold)"
                      : "none",
                // Joker-swap shake takes priority; else freshly drawn/received
                // tiles glow, then fade (~6s).
                animation:
                  swapShakeIds.includes(t.id) || shakeTileId === t.id
                    ? "tile-shake 450ms ease"
                    : highlighted.has(t.id)
                      ? `tile-highlight ${HIGHLIGHT_MS}ms ease`
                      : undefined,
              }}
            >
              <TileView
                tile={t}
                width={52}
                selected={selected.has(t.id)}
                onClick={() => onTileClick(t)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      </div>

      {actionSlot && <div className="mt-[18px]">{actionSlot}</div>}

      {/* Floating clone that follows the pointer while dragging a tile—the key
          affordance on touch, where the finger otherwise covers the tile. */}
      {ghost && (
        <div
          className="fixed pointer-events-none z-[300] opacity-95 drop-shadow-[0_8px_16px_oklch(0.22_0.05_255_/_0.5)]"
          // Pointer-tracked position, and the offset transform that goes with it.
          style={{
            left: ghost.x,
            top: ghost.y,
            transform: "translate(-50%, -120%) rotate(-4deg)",
          }}
        >
          <TileView tile={ghost.tile} width={52} />
        </div>
      )}
    </div>
  )
}
