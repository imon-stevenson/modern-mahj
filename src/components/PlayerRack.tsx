import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import type { PlayerState, Tile } from "../game/types";
import { TileView } from "./Tile";
import { ExposureRow } from "./ExposureRow";
import { applyRackOrder } from "./rackOrder";

// Hold + fade duration for the "new tile" highlight — keep in sync with the
// `tile-highlight` keyframe in index.css (5s hold + 1s fade).
const HIGHLIGHT_MS = 6000;

// Tracks which rack tile ids were recently added (drawn or received in the
// Charleston) so they can be highlighted, then auto-cleared after the fade.
// The initial hand (first render) is treated as already-present, not new.
function useNewTileHighlights(ids: string[]): Set<string> {
  const seen = useRef<Set<string> | null>(null);
  const timers = useRef<Map<string, number>>(new Map());
  const [highlighted, setHighlighted] = useState<Set<string>>(() => new Set());
  const key = ids.join(",");

  useEffect(() => {
    const current = key ? key.split(",") : [];
    if (seen.current === null) {
      seen.current = new Set(current);
      return;
    }
    const added = current.filter((id) => !seen.current!.has(id));
    seen.current = new Set(current);
    if (added.length === 0) return;

    setHighlighted((prev) => {
      const next = new Set(prev);
      added.forEach((id) => next.add(id));
      return next;
    });
    added.forEach((id) => {
      const existing = timers.current.get(id);
      if (existing) window.clearTimeout(existing);
      const t = window.setTimeout(() => {
        setHighlighted((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        timers.current.delete(id);
      }, HIGHLIGHT_MS);
      timers.current.set(id, t);
    });
  }, [key]);

  useEffect(() => {
    const timeouts = timers.current;
    return () => timeouts.forEach((t) => window.clearTimeout(t));
  }, []);

  return highlighted;
}

type Props = {
  player: PlayerState;
  selectedIds: string[];
  onTileClick: (tile: Tile) => void;
  disabled?: boolean;
  active?: boolean;
  actionSlot?: ReactNode;
  // Manual tile order (ids) and callbacks for drag-to-rearrange. When
  // rackOrder is null the tiles fall back to the default suit/number sort.
  rackOrder?: string[] | null;
  onReorder?: (orderedIds: string[]) => void;
  onResetOrder?: () => void;
  // Id of the tile pinned to the far right of the rack (the freshly drawn tile).
  pinnedTileId?: string | null;
};

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
  >(null);
  const activePinnedTileId =
    pinnedTileId && pinnedTileId !== dismissedPinnedTileId
      ? pinnedTileId
      : null;

  const ordered = useMemo(
    () => applyRackOrder(player.rack, rackOrder, activePinnedTileId),
    [player.rack, rackOrder, activePinnedTileId],
  );
  const selected = new Set(selectedIds);
  const total =
    player.rack.length +
    player.exposures.reduce((n, e) => n + e.tiles.length, 0);

  const highlighted = useNewTileHighlights(player.rack.map((t) => t.id));

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const commitDrop = (draggedId: string, targetId: string) => {
    if (!onReorder || draggedId === targetId) return;
    const ids = ordered.map((t) => t.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    const insertAt = ids.indexOf(targetId);
    ids.splice(from < to ? insertAt + 1 : insertAt, 0, draggedId);
    onReorder(ids);
  };

  const onDragStart = (e: DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {
      /* some browsers restrict setData; dragId state covers us */
    }
  };
  const onDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    const dragged = e.dataTransfer.getData("text/plain") || dragId;
    if (dragged) commitDrop(dragged, targetId);
    setDragId(null);
    setOverId(null);
  };

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
                setDismissedPinnedTileId(pinnedTileId ?? null);
                onResetOrder?.();
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
          <ExposureRow exposures={player.exposures} tileWidth={48} flip />
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
              draggable
              onDragStart={(e) => onDragStart(e, t.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId && overId !== t.id) setOverId(t.id);
              }}
              onDragLeave={() =>
                setOverId((cur) => (cur === t.id ? null : cur))
              }
              onDrop={(e) => onDrop(e, t.id)}
              style={{
                cursor: "grab",
                borderRadius: 9,
                opacity: dragId === t.id ? 0.35 : 1,
                boxShadow:
                  overId === t.id && dragId && dragId !== t.id
                    ? "0 0 0 2px var(--gold)"
                    : "none",
                transition: "opacity 120ms ease, box-shadow 120ms ease",
                touchAction: "none",
                // Freshly drawn / received tiles glow gold, then fade (~6s).
                animation: highlighted.has(t.id)
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
    </div>
  );
}
