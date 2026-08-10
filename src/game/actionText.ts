import type { CallKind, Seat, Tile } from "./types"
import { tileLabel } from "./tiles"

// Human-readable sentences describing what another player just did, shown as a
// transient flash on that seat's card. Pure text—no React, no store.

export const SEAT_LABEL: Record<Seat, string> = {
  east: "East",
  south: "South",
  west: "West",
  north: "North",
}

const CALL_LABEL: Record<CallKind, string> = {
  pung: "Pung",
  kong: "Kong",
  quint: "Quint",
  sextet: "Sextet",
  mahjong: "Mahjong",
}

// Every label tileLabel produces pluralizes with a plain "s"—"3 Bams",
// "Bird Bams", "Red Dragons", "Soaps", "East Winds".
const plural = (label: string) => `${label}s`

export function callFlashText(kind: CallKind, tile: Tile, from: Seat): string {
  if (kind === "mahjong") {
    return `declared Mahjong on ${SEAT_LABEL[from]}'s ${tileLabel(tile)}`
  }
  return `called a ${CALL_LABEL[kind]} of ${plural(tileLabel(tile))} from ${SEAT_LABEL[from]}'s discard`
}

export function jokerSwapFlashText(
  given: Tile,
  targetSeat: Seat,
  offeringSeat: Seat,
): string {
  const whose =
    targetSeat === offeringSeat ? "their own" : `${SEAT_LABEL[targetSeat]}'s`
  return `replaced a ${tileLabel(given)} for ${whose} Joker`
}
