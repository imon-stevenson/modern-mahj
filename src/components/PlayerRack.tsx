import { useMemo, useState, type DragEvent, type ReactNode } from "react";
import type { PlayerState, Tile } from "../game/types";
import { TileView } from "./Tile";
import { ExposureRow } from "./ExposureRow";
import { applyRackOrder } from "./rackOrder";

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
}: Props): React.ReactElement {
  const ordered = useMemo(
    () => applyRackOrder(player.rack, rackOrder),
    [player.rack, rackOrder],
  );
  const selected = new Set(selectedIds);
  const total =
    player.rack.length +
    player.exposures.reduce((n, e) => n + e.tiles.length, 0);

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
              onClick={onResetOrder}
              title="Sort tiles by suit and number"
            >
              Default Sort
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

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
          paddingTop: "12px",
        }}
      >
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
        {player.exposures.length > 0 && (
          <>
            <div
              style={{
                width: 1,
                height: 60,
                background: "var(--felt-divider)",
              }}
            />
            <ExposureRow exposures={player.exposures} tileWidth={44} />
          </>
        )}
      </div>

      {actionSlot && <div style={{ marginTop: 18 }}>{actionSlot}</div>}
    </div>
  );
}
