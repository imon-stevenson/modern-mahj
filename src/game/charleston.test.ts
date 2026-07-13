import { describe, expect, it } from 'vitest';
import {
  CHARLESTON_ORDER,
  acrossFrom,
  applyPass,
  leftOf,
  nextPass,
  passTarget,
  rightOf,
} from './charleston';
import type { PlayerState, Seat, Tile } from './types';
import { SEATS } from './types';

function makeTile(id: string): Tile {
  return { id, kind: 'number', suit: 'bams', rank: 1 };
}

function makePlayers(): Record<Seat, PlayerState> {
  return Object.fromEntries(
    SEATS.map((seat) => [
      seat,
      {
        seat,
        rack: Array.from({ length: 6 }, (_, i) => makeTile(`${seat}-${i}`)),
        exposures: [],
        isBot: seat !== 'east',
      } satisfies PlayerState,
    ]),
  ) as unknown as Record<Seat, PlayerState>;
}

describe('seat topology', () => {
  it('right rotates counterclockwise east→north→west→south', () => {
    expect(rightOf('east')).toBe('north');
    expect(rightOf('north')).toBe('west');
    expect(rightOf('west')).toBe('south');
    expect(rightOf('south')).toBe('east');
  });

  it('left is the inverse of right', () => {
    for (const seat of SEATS) {
      expect(leftOf(rightOf(seat))).toBe(seat);
    }
  });

  it('across is symmetric', () => {
    for (const seat of SEATS) {
      expect(acrossFrom(acrossFrom(seat))).toBe(seat);
    }
  });
});

describe('nextPass', () => {
  it('walks through the standard Charleston sequence and ends after courtesy', () => {
    let cur: (typeof CHARLESTON_ORDER)[number] | null = CHARLESTON_ORDER[0]!;
    const visited: string[] = [];
    while (cur) {
      visited.push(cur);
      cur = nextPass(cur);
    }
    expect(visited).toEqual([...CHARLESTON_ORDER]);
  });
});

describe('applyPass', () => {
  it('moves 3 tiles from each seat to the correct neighbor on a right pass', () => {
    const players = makePlayers();
    const sel: Record<Seat, Tile[]> = {
      east: players.east.rack.slice(0, 3),
      north: players.north.rack.slice(0, 3),
      west: players.west.rack.slice(0, 3),
      south: players.south.rack.slice(0, 3),
    };
    const next = applyPass(players, 'firstRight', sel);
    // East passes right to North; check the ids are gone from east and present in north.
    const eastPassedIds = sel.east.map((t) => t.id);
    for (const id of eastPassedIds) {
      expect(next.east.rack.find((t) => t.id === id)).toBeUndefined();
      expect(next.north.rack.find((t) => t.id === id)).toBeDefined();
    }
    // Every seat still has 6 tiles (loses 3, gains 3).
    for (const seat of SEATS) expect(next[seat].rack).toHaveLength(6);
  });

  it('routes correctly on an across pass', () => {
    const players = makePlayers();
    const sel: Record<Seat, Tile[]> = {
      east: players.east.rack.slice(0, 3),
      north: players.north.rack.slice(0, 3),
      west: players.west.rack.slice(0, 3),
      south: players.south.rack.slice(0, 3),
    };
    const next = applyPass(players, 'firstAcross', sel);
    for (const id of sel.east.map((t) => t.id)) {
      expect(next.west.rack.find((t) => t.id === id)).toBeDefined();
    }
    for (const id of sel.north.map((t) => t.id)) {
      expect(next.south.rack.find((t) => t.id === id)).toBeDefined();
    }
  });

  it('rejects a selection that includes a tile not in the seat rack', () => {
    const players = makePlayers();
    const sel: Record<Seat, Tile[]> = {
      east: [makeTile('bogus'), players.east.rack[1]!, players.east.rack[2]!],
      north: players.north.rack.slice(0, 3),
      west: players.west.rack.slice(0, 3),
      south: players.south.rack.slice(0, 3),
    };
    expect(() => applyPass(players, 'firstRight', sel)).toThrow();
  });

  it('rejects a non-courtesy pass with the wrong count', () => {
    const players = makePlayers();
    const sel: Record<Seat, Tile[]> = {
      east: players.east.rack.slice(0, 2),
      north: players.north.rack.slice(0, 3),
      west: players.west.rack.slice(0, 3),
      south: players.south.rack.slice(0, 3),
    };
    expect(() => applyPass(players, 'firstRight', sel)).toThrow();
  });

  it('allows 0..3 tiles per seat on a courtesy pass', () => {
    const players = makePlayers();
    const sel: Record<Seat, Tile[]> = {
      east: players.east.rack.slice(0, 1),
      west: players.west.rack.slice(0, 1),
      south: players.south.rack.slice(0, 2),
      north: players.north.rack.slice(0, 2),
    };
    const next = applyPass(players, 'courtesy', sel);
    // East passed 1 across to West and gained West's 1.
    expect(next.east.rack).toHaveLength(6);
    expect(next.west.rack).toHaveLength(6);
  });
});

describe('passTarget', () => {
  it('directs each pass in the intended direction', () => {
    expect(passTarget('east', 'firstRight')).toBe('north');
    expect(passTarget('east', 'firstAcross')).toBe('west');
    expect(passTarget('east', 'firstLeft')).toBe('south');
    expect(passTarget('east', 'secondLeft')).toBe('south');
    expect(passTarget('east', 'secondRight')).toBe('north');
    expect(passTarget('east', 'courtesy')).toBe('west');
  });
});
