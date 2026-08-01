import { create } from "zustand"
import type { Seat, Tile } from "../game/types"

// A tiny, non-persisted store dedicated to the Charleston "tiles floating to a
// seat" animation. Kept separate from game state so it never touches gameplay
// or localStorage.

export type FlightTile = {
  key: string
  tile: Tile
  fromX: number
  fromY: number
}

type CharlestonFlightState = {
  flights: FlightTile[]
  toX: number
  toY: number
  active: boolean
  _start: (p: { flights: FlightTile[]; toX: number; toY: number }) => void
  _clear: () => void
}

export const useCharlestonFlightStore = create<CharlestonFlightState>(
  (set) => ({
    flights: [],
    toX: 0,
    toY: 0,
    active: false,
    _start: (p) => set({ ...p, active: true }),
    _clear: () => set({ flights: [], active: false }),
  }),
)

export const FLIGHT_TILE_WIDTH = 100
export const CHARLESTON_FLIGHT_DURATION_MS = 820
export const FLIGHT_STAGGER_MS = 45

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

function cssEscape(s: string): string {
  if (
    typeof window !== "undefined" &&
    window.CSS &&
    typeof CSS.escape === "function"
  ) {
    return CSS.escape(s)
  }
  return s.replace(/["\\]/g, "\\$&")
}

export type CapturedFlight = {
  flights: FlightTile[]
  toX: number
  toY: number
} | null

// Read the current screen positions of the given tiles (by `data-tile-id`) and
// the center of the target seat's panel (by `id="seat-<seat>"`). MUST be called
// while the tiles are still on screen — i.e. before the pass mutates the rack.
export function captureCharlestonFlight(
  tiles: Tile[],
  targetSeat: Seat,
): CapturedFlight {
  if (prefersReducedMotion() || typeof document === "undefined") return null
  const targetEl = document.getElementById(`seat-${targetSeat}`)
  if (!targetEl) return null

  const flights: FlightTile[] = []
  for (const tile of tiles) {
    const el = document.querySelector(`[data-tile-id="${cssEscape(tile.id)}"]`)
    if (!el) continue
    const r = el.getBoundingClientRect()
    flights.push({ key: tile.id, tile, fromX: r.left, fromY: r.top })
  }
  if (flights.length === 0) return null

  const tr = targetEl.getBoundingClientRect()
  const toX = tr.left + tr.width / 2 - FLIGHT_TILE_WIDTH / 2
  const toY = tr.top + tr.height / 2 - (FLIGHT_TILE_WIDTH * 1.375) / 2
  return { flights, toX, toY }
}

// Run a previously captured flight. Resolves when the animation finishes (or
// immediately when there's nothing to animate / reduced motion is on).
export function playCharlestonFlight(
  data: CapturedFlight,
  durationMs = CHARLESTON_FLIGHT_DURATION_MS,
): Promise<void> {
  if (!data) return Promise.resolve()
  useCharlestonFlightStore.getState()._start(data)
  // Hold the overlay until the last (staggered) clone has finished flying.
  const total =
    durationMs + Math.max(0, data.flights.length - 1) * FLIGHT_STAGGER_MS
  return new Promise((resolve) => {
    window.setTimeout(() => {
      useCharlestonFlightStore.getState()._clear()
      resolve()
    }, total)
  })
}
