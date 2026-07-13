import type { PlayerState, Seat, Tile } from './types';
import { SEATS } from './types';
import { createFullTileSet } from './tiles';
import { shuffleInPlace } from './rng';
import type { Rng } from './rng';

export type Deal = {
  wall: Tile[];
  players: Record<Seat, PlayerState>;
};

// American Mahjong deal: East gets 14, the other three get 13. Any flower
// tiles dealt into a rack are immediately swapped from the top of the wall
// until no flowers remain in any rack. (Flowers are collected as bonus tiles
// but for simplicity we treat them as regular tiles the player holds; the
// hands JSON can reference them.)

export function dealFromWall(rng: Rng, isBot: (seat: Seat) => boolean): Deal {
  const wall = shuffleInPlace(createFullTileSet(), rng);
  const players = Object.fromEntries(
    SEATS.map((seat) => [
      seat,
      {
        seat,
        rack: [] as Tile[],
        exposures: [],
        isBot: isBot(seat),
      } satisfies PlayerState,
    ]),
  ) as unknown as Record<Seat, PlayerState>;

  for (const seat of SEATS) {
    const count = seat === 'east' ? 14 : 13;
    for (let i = 0; i < count; i++) {
      const tile = wall.shift();
      if (!tile) throw new Error('wall exhausted during deal');
      players[seat].rack.push(tile);
    }
  }

  return { wall, players };
}

export function drawFromWall(wall: Tile[]): { tile: Tile | null; wall: Tile[] } {
  if (wall.length === 0) return { tile: null, wall };
  const [tile, ...rest] = wall;
  return { tile: tile!, wall: rest };
}
