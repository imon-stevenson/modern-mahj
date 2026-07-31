import type { CSSProperties } from "react";
import { SWAP_FLIGHT_MS, useJokerSwapUi } from "../store/jokerSwapUi";
import { TileView } from "./Tile";

const CLONE_W = 48;

// Renders the two tiles crossing during a joker swap (joker → rack, natural →
// exposure). Pure CSS `swap-float` keyframe using per-clone --fx/--fy deltas.
export function JokerSwapFlightOverlay(): React.ReactElement | null {
  const active = useJokerSwapUi((s) => s.active);
  const clones = useJokerSwapUi((s) => s.clones);
  if (!active) return null;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 200 }}>
      {clones.map((c) => {
        const style: CSSProperties = {
          position: "absolute",
          left: c.fromX,
          top: c.fromY,
          animation: `swap-float ${SWAP_FLIGHT_MS}ms cubic-bezier(0.45, 0, 0.2, 1) forwards`,
          filter: "drop-shadow(0 6px 12px rgba(20, 20, 40, 0.4))",
          willChange: "transform",
        };
        (style as Record<string, string>)["--fx"] = `${c.toX - c.fromX}px`;
        (style as Record<string, string>)["--fy"] = `${c.toY - c.fromY}px`;
        return (
          <div key={c.key} style={style}>
            <TileView tile={c.tile} width={CLONE_W} />
          </div>
        );
      })}
    </div>
  );
}
