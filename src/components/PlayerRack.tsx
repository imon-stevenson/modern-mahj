import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { PlayerState, Tile } from "../game/types"
import { TileView } from "./Tile"
import { ExposureRow } from "./ExposureRow"
import { applyRackOrder, reorderIds } from "./rackOrder"

// Pointer must move this far before a press becomes a drag (vs a tap/click).
const DRAG_THRESHOLD_PX = 8
import { useJokerSwapUi } from "../store/jokerSwapUi"

// Hold + fade duration for the "new tile" highlight — keep in sync with the
// `tile-highlight` keyframe in index.css (5s hold + 1s fade).
const HIGHLIGHT_MS = 6000

// Tracks which rack tile ids were recently added (drawn or received in the
// Charleston) so they can be highlighted, then auto-cleared after the fade.
// The initial hand (first render) is treated as already-present, not new.
function useNewTileHighlights(ids: string[]): Set<string> {
  const seen = useRef<Set<string> | null>(null)
  const timers = useRef<Map<string, number>>(new Map())
  const [highlighted, setHighlighted] = useState<Set<string>>(() => new Set())
  const key = ids.join(",")

  useEffect(() => {
    const current = key ? key.split(",") : []
    if (seen.current === null) {
      seen.current = new Set(current)
      return
    }
    const added = current.filter((id) => !seen.current!.has(id))
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
  }, [key])

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
}: Props): React.ReactElement {
  // Once the player explicitly sorts, stop pinning the drawn tile right so it
  // merges into the sorted hand. Re-arms automatically on the next draw (new id).
  const [dismissedPinnedTileId, setDismissedPinnedTileId] = useState<
    string | null
  >(null)
  const activePinnedTileId =
    pinnedTileId && pinnedTileId !== dismissedPinnedTileId
      ? pinnedTileId
      : null

  const ordered = useMemo(
    () => applyRackOrder(player.rack, rackOrder, activePinnedTileId),
    [player.rack, rackOrder, activePinnedTileId],
  )
  const selected = new Set(selectedIds)
  const total =
    player.rack.length +
    player.exposures.reduce((n, e) => n + e.tiles.length, 0)

  const highlighted = useNewTileHighlights(player.rack.map((t) => t.id))

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
  const [ghost, setGhost] = useState<{ tile: Tile; x: number; y: number } | null>(
    null,
  )
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
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD_PX)
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
        onReorder(reorderIds(ordered.map((t) => t.id), start.id, overId))
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
      style={{
        background: "var(--felt-panel-2)",
        borderRadius: "var(--radius-md)",
        padding: "18px 22px",
        border: `1px solid ${active ? "var(--gold)" : "var(--felt-border)"}`,
        boxShadow: active ? "0 0 0 3px oklch(0.75 0.13 80 / 0.16)" : "none",
        transition: "border-color 160ms ease, box-shadow 160ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: active ? "var(--gold)" : "var(--felt-divider)",
            }}
          />
          <span
            style={{
              font: "800 14px var(--font-ui)",
              color: "var(--felt-ink)",
            }}
          >
            East · You
          </span>
          {active && (
            <span
              style={{
                font: "700 11px var(--font-ui)",
                background: "var(--gold)",
                color: "var(--gold-ink)",
                padding: "3px 8px",
                borderRadius: 20,
              }}
            >
              YOUR TURN
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onResetOrder && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "5px 12px", font: "700 11px var(--font-ui)" }}
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
          <span
            className="mono"
            style={{ font: "600 12px var(--font-mono)", color: "var(--gold)" }}
          >
            {total} tiles
          </span>
        </div>
      </div>

      {/* Exposed sets sit above the rack, rotated to face the other players —
          slightly smaller than the rack tiles, upside-down from your POV. */}
      {player.exposures.length > 0 && (
        <div
          style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}
        >
          <ExposureRow
            exposures={player.exposures}
            tileWidth={48}
            flip
            seat="east"
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          paddingTop: "12px",
        }}
      >
        <div
          onClickCapture={onRackClickCapture}
          style={{
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {ordered.map((t) => (
            <div
              key={t.id}
              data-tile-id={t.id}
              onPointerDown={(e) => onPointerDown(e, t)}
              onPointerMove={(e) => onPointerMove(e, t)}
              onPointerUp={() => endDrag(true)}
              onPointerCancel={() => endDrag(false)}
              style={{
                cursor: "grab",
                borderRadius: 9,
                opacity: dragId === t.id ? 0.35 : 1,
                visibility: swapHiddenIds.includes(t.id) ? "hidden" : "visible",
                boxShadow:
                  swapPendingId === t.id
                    ? "0 0 0 3px var(--swap-blue), 0 0 12px 2px var(--swap-blue)"
                    : overId === t.id && dragId && dragId !== t.id
                      ? "0 0 0 2px var(--gold)"
                      : "none",
                transition: "opacity 120ms ease, box-shadow 120ms ease",
                touchAction: "none",
                // Joker-swap shake takes priority; else freshly drawn/received
                // tiles glow, then fade (~6s).
                animation: swapShakeIds.includes(t.id)
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

      {actionSlot && <div style={{ marginTop: 18 }}>{actionSlot}</div>}

      {/* Floating clone that follows the pointer while dragging a tile — the key
          affordance on touch, where the finger otherwise covers the tile. */}
      {ghost && (
        <div
          style={{
            position: "fixed",
            left: ghost.x,
            top: ghost.y,
            transform: "translate(-50%, -120%) rotate(-4deg)",
            pointerEvents: "none",
            zIndex: 300,
            opacity: 0.95,
            filter: "drop-shadow(0 8px 16px oklch(0.22 0.05 255 / 0.5))",
          }}
        >
          <TileView tile={ghost.tile} width={52} />
        </div>
      )}
    </div>
  )
}
