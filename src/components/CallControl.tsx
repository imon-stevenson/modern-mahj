import { useMemo } from "react";
import { useMahjStore } from "../store";
import { matchingInRack, possibleCallsForDiscard } from "../game/turn";
import {
  handsAllowGroupingForTile,
  matchAgainstAll,
} from "../game/hands/match";
import { useCallTimer } from "../hooks/useCallTimer";
import { TileView } from "./Tile";
import type { CallKind } from "../game/types";

const CALL_LABEL: Record<CallKind, string> = {
  pung: "Pung",
  kong: "Kong",
  quint: "Quint",
  sextet: "Sextet",
  mahjong: "Mahjong!",
};

// Inline, always-present replacement for the old call pop-up. A dithered "Call"
// button sits under the rack; it enables (with a countdown) when the latest
// discard can be claimed. Pressing it pauses the timer and reveals the specific
// claims available, plus a "Never mind" to decline.
export function CallControl(): React.ReactElement {
  const awaitingCall = useMahjStore((s) => s.awaitingCall);
  const eastPlayer = useMahjStore((s) => s.players.east);
  // Load once — hands are static per session; calling the loader inside a
  // selector returns a fresh reference on failure paths and can loop.
  const loadHands = useMahjStore((s) => s.loadHandsSafe);
  const hands = useMemo(() => loadHands(), [loadHands]);
  const callWithHuman = useMahjStore((s) => s.callWithHuman);
  const openHumanCall = useMahjStore((s) => s.openHumanCall);
  const passCall = useMahjStore((s) => s.passCall);
  const lastAction = useMahjStore((s) => s.lastAction);
  // Drives the live countdown and auto-passes when the deadline expires.
  const secondsLeft = useCallTimer();

  // Memoized so it doesn't recompute the (moderately expensive) hand analysis on
  // every 200ms countdown tick — only when the discard, rack, or hands change.
  const options = useMemo<CallKind[]>(() => {
    if (!awaitingCall || !awaitingCall.callableBy.includes("east")) return [];
    const tile = awaitingCall.discardTile;
    const rack = eastPlayer.rack;
    const result: CallKind[] = [...possibleCallsForDiscard(rack, tile)];
    // Jokers count as fillers; quint/sextet are additionally gated to only when
    // a still-viable hand actually needs that grouping of this tile.
    const fillers =
      matchingInRack(rack, tile) +
      rack.filter((t) => t.kind === "joker").length;
    if (
      fillers >= 4 &&
      handsAllowGroupingForTile(eastPlayer.exposures, hands, tile, "quint")
    ) {
      result.push("quint");
    }
    if (
      fillers >= 5 &&
      handsAllowGroupingForTile(eastPlayer.exposures, hands, tile, "sextet")
    ) {
      result.push("sextet");
    }
    const trial = [...rack, tile];
    if (matchAgainstAll(trial, eastPlayer.exposures, hands)) {
      result.push("mahjong");
    }
    return result;
  }, [awaitingCall, eastPlayer.rack, eastPlayer.exposures, hands]);

  const claimable = options.length > 0;
  const choosing = !!awaitingCall?.humanChoosing;
  const discarder =
    lastAction?.kind === "discard"
      ? lastAction.seat.charAt(0).toUpperCase() + lastAction.seat.slice(1)
      : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        minHeight: 44,
      }}
    >
      {claimable && awaitingCall && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TileView tile={awaitingCall.discardTile} width={40} />
          <span
            style={{
              font: "600 13px var(--font-ui)",
              color: "var(--felt-ink-soft)",
            }}
          >
            {discarder} discarded
          </span>
        </div>
      )}

      {choosing ? (
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
        >
          {options.map((kind) => (
            <button
              key={kind}
              type="button"
              className={kind === "mahjong" ? "btn btn-gold" : "btn btn-green"}
              onClick={() => callWithHuman(kind)}
            >
              {CALL_LABEL[kind]}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => passCall()}
          >
            Never mind
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => openHumanCall()}
            disabled={!claimable}
          >
            Call
          </button>
          {claimable && secondsLeft !== null && (
            <span
              className="mono"
              style={{
                font: "700 14px var(--font-mono)",
                color: "var(--suit-red)",
              }}
            >
              {secondsLeft}s
            </span>
          )}
        </div>
      )}
    </div>
  );
}
