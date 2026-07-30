import type { Tile } from "../game/types";
import { TileView } from "./Tile";
import { useDiscardFlightStore } from "../store/discardFlight";

export function DiscardPile({
  discards,
}: {
  discards: Tile[];
}): React.ReactElement {
  const recent = discards.slice(-24);
  // While a discard is mid-air, keep its landing spot invisible so it isn't
  // shown in the pile and flying simultaneously; it "appears" as the clone lands.
  const inFlightTileId = useDiscardFlightStore((s) => s.inFlightTileId);
  return (
    <div
      id="discard-pile"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
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
        Discarded Tiles{" "}
        <span className="mono" style={{ color: "var(--felt-ink-soft)" }}>
          · {discards.length}
        </span>
      </div>
      {recent.length === 0 ? (
        <div
          style={{
            font: "500 12px var(--font-ui)",
            color: "var(--felt-ink-mute)",
            opacity: 0.7,
          }}
        >
          No discards yet
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            maxWidth: 380,
            justifyContent: "center",
          }}
        >
          {recent.map((t) => (
            <div
              key={t.id}
              style={{ visibility: t.id === inFlightTileId ? "hidden" : "visible" }}
            >
              <TileView tile={t} width={38} dimmed />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
