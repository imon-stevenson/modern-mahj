import { create } from 'zustand';
import type { Seat, Tile } from '../game/types';

// A tiny, non-persisted store for the "discarded tile flies to the pile"
// animation. One tile in flight at a time (turns are sequential). Kept separate
// from game state so it never touches gameplay or localStorage.

export const DISCARD_TILE_WIDTH = 56;
export const DISCARD_FLIGHT_DURATION_MS = 500;

type Flight = {
  tile: Tile;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

type DiscardFlightState = {
  flight: Flight | null;
  // Id of the tile currently mid-air, so the pile can hide it until it lands.
  inFlightTileId: string | null;
  _start: (f: Flight, tileId: string) => void;
  _clear: () => void;
};

export const useDiscardFlightStore = create<DiscardFlightState>((set) => ({
  flight: null,
  inFlightTileId: null,
  _start: (flight, tileId) => set({ flight, inFlightTileId: tileId }),
  _clear: () => set({ flight: null, inFlightTileId: null }),
}));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Animate the discarded tile from the discarding player's seat panel to the
// center discard pile. No-op (and nothing hidden) under reduced motion.
export function flyDiscard(seat: Seat, tile: Tile): void {
  if (prefersReducedMotion() || typeof document === 'undefined') return;
  const fromEl = document.getElementById(`seat-${seat}`);
  const toEl = document.getElementById('discard-pile');
  if (!fromEl || !toEl) return;

  const fr = fromEl.getBoundingClientRect();
  const tr = toEl.getBoundingClientRect();
  const halfW = DISCARD_TILE_WIDTH / 2;
  const halfH = (DISCARD_TILE_WIDTH * 1.375) / 2;
  const flight: Flight = {
    tile,
    fromX: fr.left + fr.width / 2 - halfW,
    fromY: fr.top + fr.height / 2 - halfH,
    toX: tr.left + tr.width / 2 - halfW,
    toY: tr.top + tr.height / 2 - halfH,
  };
  useDiscardFlightStore.getState()._start(flight, tile.id);
  window.setTimeout(() => {
    // Only clear if this same flight is still the active one.
    if (useDiscardFlightStore.getState().inFlightTileId === tile.id) {
      useDiscardFlightStore.getState()._clear();
    }
  }, DISCARD_FLIGHT_DURATION_MS);
}
