import type { CharlestonPass, PlayerState, Seat, Tile } from './types';
import { SEATS } from './types';

// Seating & turn order per American Mahjong: East → North → West → South
// (counterclockwise). "Right" during Charleston means the next player in
// that turn order.

const RIGHT_OF: Record<Seat, Seat> = {
  east: 'north',
  north: 'west',
  west: 'south',
  south: 'east',
};

const LEFT_OF: Record<Seat, Seat> = {
  east: 'south',
  south: 'west',
  west: 'north',
  north: 'east',
};

const ACROSS_OF: Record<Seat, Seat> = {
  east: 'west',
  west: 'east',
  north: 'south',
  south: 'north',
};

export function rightOf(seat: Seat): Seat {
  return RIGHT_OF[seat];
}
export function leftOf(seat: Seat): Seat {
  return LEFT_OF[seat];
}
export function acrossFrom(seat: Seat): Seat {
  return ACROSS_OF[seat];
}

export type Direction = 'right' | 'across' | 'left';

const PASS_DIRECTION: Record<CharlestonPass, Direction> = {
  firstRight: 'right',
  firstAcross: 'across',
  firstLeft: 'left',
  secondLeft: 'left',
  secondAcross: 'across',
  secondRight: 'right',
  courtesy: 'across',
};

export function passDirection(pass: CharlestonPass): Direction {
  return PASS_DIRECTION[pass];
}

export function passTarget(seat: Seat, pass: CharlestonPass): Seat {
  const dir = passDirection(pass);
  if (dir === 'right') return rightOf(seat);
  if (dir === 'left') return leftOf(seat);
  return acrossFrom(seat);
}

export const CHARLESTON_ORDER: readonly CharlestonPass[] = [
  'firstRight',
  'firstAcross',
  'firstLeft',
  'secondLeft',
  'secondAcross',
  'secondRight',
  'courtesy',
] as const;

export function nextPass(pass: CharlestonPass): CharlestonPass | null {
  const idx = CHARLESTON_ORDER.indexOf(pass);
  if (idx < 0 || idx === CHARLESTON_ORDER.length - 1) return null;
  return CHARLESTON_ORDER[idx + 1]!;
}

// Given every seat's selection of tiles, produce updated racks. Selections
// are validated to have the expected size (3 for non-courtesy; each seat may
// pass 0..3 for courtesy — the pair's agreed count is enforced upstream).
export function applyPass(
  players: Record<Seat, PlayerState>,
  pass: CharlestonPass,
  selections: Record<Seat, Tile[]>,
): Record<Seat, PlayerState> {
  const expected = pass === 'courtesy' ? null : 3;
  if (expected !== null) {
    for (const seat of SEATS) {
      if (selections[seat].length !== expected) {
        throw new Error(
          `charleston ${pass}: ${seat} must pass ${expected} tiles, got ${selections[seat].length}`,
        );
      }
    }
  }

  // Verify every selected tile is currently in that seat's rack.
  for (const seat of SEATS) {
    const rackIds = new Set(players[seat].rack.map((t) => t.id));
    for (const t of selections[seat]) {
      if (!rackIds.has(t.id)) {
        throw new Error(`charleston ${pass}: ${seat} does not hold tile ${t.id}`);
      }
    }
  }

  const next: Record<Seat, PlayerState> = { ...players };
  // Remove passed tiles from each seat first.
  for (const seat of SEATS) {
    const passingIds = new Set(selections[seat].map((t) => t.id));
    next[seat] = {
      ...players[seat],
      rack: players[seat].rack.filter((t) => !passingIds.has(t.id)),
    };
  }
  // Then hand them to the target seat.
  for (const seat of SEATS) {
    const target = passTarget(seat, pass);
    next[target] = {
      ...next[target],
      rack: [...next[target].rack, ...selections[seat]],
    };
  }
  return next;
}
