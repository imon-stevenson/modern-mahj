import type { CallKind, PlayerState, Seat, Tile } from './types';
import { SEATS } from './types';
import { tilesEqual } from './tiles';
import { rightOf } from './charleston';

// Play order is counterclockwise: east → north → west → south → east.
export function nextSeat(seat: Seat): Seat {
  return rightOf(seat);
}

// How many identical (non-joker) tiles the seat holds that match `tile`.
export function matchingInRack(rack: readonly Tile[], tile: Tile): number {
  return rack.filter((t) => t.kind !== 'joker' && tilesEqual(t, tile)).length;
}

// Non-mahjong calls available on a discard for this seat, given only their
// rack (mahjong requires the hand-matching engine and is checked separately).
export function possibleCallsForDiscard(rack: readonly Tile[], tile: Tile): CallKind[] {
  const n = matchingInRack(rack, tile);
  const calls: CallKind[] = [];
  if (n >= 2) calls.push('pung');
  if (n >= 3) calls.push('kong');
  return calls;
}

// Rank calls for priority. Higher number = higher priority.
export function callPriority(kind: CallKind): number {
  if (kind === 'mahjong') return 3;
  if (kind === 'kong') return 2;
  return 1; // pung
}

// If more than one seat wants to call, pick the winner. Mahjong beats non-
// mahjong. Between non-mahjong calls of the same rank, the seat closest to
// the discarder in play order wins.
export type CallRequest = { seat: Seat; kind: CallKind };

export function resolveCallPriority(
  discarder: Seat,
  requests: readonly CallRequest[],
): CallRequest | null {
  if (requests.length === 0) return null;
  const highest = Math.max(...requests.map((r) => callPriority(r.kind)));
  const top = requests.filter((r) => callPriority(r.kind) === highest);
  if (top.length === 1) return top[0]!;
  // Tie-break by play order from discarder.
  const order: Seat[] = [];
  let cur = nextSeat(discarder);
  for (let i = 0; i < SEATS.length - 1; i++) {
    order.push(cur);
    cur = nextSeat(cur);
  }
  for (const seat of order) {
    const match = top.find((r) => r.seat === seat);
    if (match) return match;
  }
  return top[0]!;
}

// Remove `count` tiles matching `tile` from a rack. Used when a caller
// consumes matching tiles from their own rack to form the exposure.
export function takeMatchingFromRack(
  rack: readonly Tile[],
  tile: Tile,
  count: number,
): { taken: Tile[]; rack: Tile[] } {
  const taken: Tile[] = [];
  const remaining: Tile[] = [];
  for (const t of rack) {
    if (taken.length < count && t.kind !== 'joker' && tilesEqual(t, tile)) {
      taken.push(t);
    } else {
      remaining.push(t);
    }
  }
  if (taken.length < count) {
    throw new Error(`not enough matching tiles in rack to take ${count}`);
  }
  return { taken, rack: remaining };
}

// Remove a tile by id from a rack. Throws if missing.
export function removeTileById(rack: readonly Tile[], id: string): Tile[] {
  const idx = rack.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error(`tile ${id} not in rack`);
  return [...rack.slice(0, idx), ...rack.slice(idx + 1)];
}

export type CalledExposureTiles = {
  fromDiscard: Tile;
  fromRack: Tile[]; // real matching tiles taken from the caller's rack
};

// Which non-joker tiles the caller must contribute from their rack for a
// pung/kong of the given discard. (Naturals only, no joker substitution here;
// substitution can happen if the caller chooses to bring jokers by supplying
// them explicitly. For simplicity, MVP: use only naturals from rack.)
export function tilesForCall(
  kind: Exclude<CallKind, 'mahjong'>,
  discard: Tile,
  rack: readonly Tile[],
): CalledExposureTiles {
  const need = kind === 'pung' ? 2 : 3;
  const { taken } = takeMatchingFromRack(rack, discard, need);
  return { fromDiscard: discard, fromRack: taken };
}

// Utility for game orchestration: after a claim, the caller is the new
// current seat and they must discard next.
export function callerBecomesCurrent(caller: Seat): Seat {
  return caller;
}

// Convenience: check current seat has any tiles left (for turn continuation).
export function rackSize(player: PlayerState): number {
  return player.rack.length;
}
