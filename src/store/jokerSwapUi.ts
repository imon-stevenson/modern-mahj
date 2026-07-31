import { create } from "zustand";
import type { Seat, Tile } from "../game/types";
import type { JokerSwapOffer } from "../game/jokerSwap";
import { validateJokerSwap } from "../game/jokerSwap";
import { useMahjStore } from "./index";

export type SwapSource = { seat: Seat; exposureIndex: number; jokerId: string };
type Clone = { key: string; tile: Tile; fromX: number; fromY: number; toX: number; toY: number };

const SHAKE_MS = 450;
export const SWAP_FLIGHT_MS = 480;
const CLONE_W = 48;

type JokerSwapUiState = {
  source: SwapSource | null;
  pendingRackId: string | null;
  shakeIds: string[];
  hiddenIds: string[];
  clones: Clone[];
  active: boolean;
  toggleJoker: (s: SwapSource) => void;
  clearSwap: () => void;
  _set: (p: Partial<JokerSwapUiState>) => void;
};

export const useJokerSwapUi = create<JokerSwapUiState>((set, get) => ({
  source: null,
  pendingRackId: null,
  shakeIds: [],
  hiddenIds: [],
  clones: [],
  active: false,
  toggleJoker: (s) => {
    const cur = get().source;
    if (cur && cur.jokerId === s.jokerId) {
      set({ source: null });
    } else {
      set({ source: s, shakeIds: [], pendingRackId: null });
    }
  },
  clearSwap: () =>
    set({ source: null, pendingRackId: null, shakeIds: [], hiddenIds: [], clones: [], active: false }),
  _set: (p) => set(p),
}));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function rectOf(tileId: string): { x: number; y: number } | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(`[data-tile-id="${cssEscape(tileId)}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - CLONE_W / 2, y: r.top + (r.height - CLONE_W * 1.375) / 2 };
}

function cssEscape(s: string): string {
  if (typeof window !== "undefined" && window.CSS && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/["\\]/g, "\\$&");
}

// Attempt to complete a joker swap by offering the given rack tile. Returns true
// if a swap was in progress (so the caller shouldn't treat the click as a
// discard). Handles validation, the shake-on-invalid, and the swap animation.
export function attemptJokerSwap(offeredTileId: string): boolean {
  const ui = useJokerSwapUi.getState();
  const src = ui.source;
  if (!src) return false;

  const game = useMahjStore.getState();
  const offer: JokerSwapOffer = {
    offeringSeat: "east",
    offeredTileId,
    targetSeat: src.seat,
    exposureIndex: src.exposureIndex,
    jokerId: src.jokerId,
  };

  const v = validateJokerSwap(game.players, offer);
  if (!v.ok) {
    ui._set({ pendingRackId: offeredTileId, shakeIds: [src.jokerId, offeredTileId] });
    window.setTimeout(() => useJokerSwapUi.getState().clearSwap(), SHAKE_MS);
    return true;
  }

  const applyNow = () => {
    useMahjStore.getState().offerJokerSwap(offer);
    useJokerSwapUi.getState().clearSwap();
  };

  const jokerTile = game.players[src.seat].exposures[src.exposureIndex]?.tiles.find(
    (t) => t.id === src.jokerId,
  );
  const natTile = game.players.east.rack.find((t) => t.id === offeredTileId);
  const jokerRect = rectOf(src.jokerId);
  const natRect = rectOf(offeredTileId);

  if (prefersReducedMotion() || !jokerTile || !natTile || !jokerRect || !natRect) {
    applyNow();
    return true;
  }

  // Cross the two tiles: joker → the natural's spot, natural → the joker's slot.
  const clones: Clone[] = [
    { key: jokerTile.id, tile: jokerTile, fromX: jokerRect.x, fromY: jokerRect.y, toX: natRect.x, toY: natRect.y },
    { key: natTile.id, tile: natTile, fromX: natRect.x, fromY: natRect.y, toX: jokerRect.x, toY: jokerRect.y },
  ];
  ui._set({
    pendingRackId: offeredTileId,
    hiddenIds: [src.jokerId, offeredTileId],
    clones,
    active: true,
  });
  window.setTimeout(applyNow, SWAP_FLIGHT_MS);
  return true;
}
