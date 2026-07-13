import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { dealFromWall, drawFromWall } from './wall';
import { SEATS } from './types';

const isBotHumanEast = (seat: string) => seat !== 'east';

describe('dealFromWall', () => {
  it('deals 14 to east and 13 to each other seat, leaving the rest in the wall', () => {
    const rng = createRng(42);
    const { players, wall } = dealFromWall(rng, isBotHumanEast);
    expect(players.east.rack).toHaveLength(14);
    expect(players.south.rack).toHaveLength(13);
    expect(players.west.rack).toHaveLength(13);
    expect(players.north.rack).toHaveLength(13);
    expect(wall).toHaveLength(152 - 14 - 13 * 3);
  });

  it('is reproducible from the same seed', () => {
    const a = dealFromWall(createRng(7), isBotHumanEast);
    const b = dealFromWall(createRng(7), isBotHumanEast);
    for (const seat of SEATS) {
      expect(a.players[seat].rack.map((t) => t.id)).toEqual(
        b.players[seat].rack.map((t) => t.id),
      );
    }
  });

  it('produces different deals from different seeds', () => {
    const a = dealFromWall(createRng(1), isBotHumanEast);
    const b = dealFromWall(createRng(2), isBotHumanEast);
    expect(a.players.east.rack.map((t) => t.id)).not.toEqual(
      b.players.east.rack.map((t) => t.id),
    );
  });

  it('marks non-east seats as bots and east as human', () => {
    const { players } = dealFromWall(createRng(1), isBotHumanEast);
    expect(players.east.isBot).toBe(false);
    expect(players.south.isBot).toBe(true);
    expect(players.west.isBot).toBe(true);
    expect(players.north.isBot).toBe(true);
  });
});

describe('drawFromWall', () => {
  it('returns the top tile and the remaining wall', () => {
    const rng = createRng(3);
    const { wall } = dealFromWall(rng, isBotHumanEast);
    const first = wall[0];
    const drawn = drawFromWall(wall);
    expect(drawn.tile?.id).toBe(first?.id);
    expect(drawn.wall).toHaveLength(wall.length - 1);
  });

  it('returns null when the wall is empty', () => {
    const drawn = drawFromWall([]);
    expect(drawn.tile).toBeNull();
    expect(drawn.wall).toHaveLength(0);
  });
});
