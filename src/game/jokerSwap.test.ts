import { describe, expect, it } from 'vitest';
import { applyJokerSwap, validateJokerSwap } from './jokerSwap';
import { buildExposure } from './exposure';
import type { PlayerState, Seat, Tile } from './types';
import { SEATS } from './types';

const fiveBam = (id: string): Tile => ({ id, kind: 'number', suit: 'bams', rank: 5 });
const sixBam = (id: string): Tile => ({ id, kind: 'number', suit: 'bams', rank: 6 });
const joker = (id: string): Tile => ({ id, kind: 'joker' });

function makePlayers(): Record<Seat, PlayerState> {
  const players = Object.fromEntries(
    SEATS.map((seat) => [
      seat,
      { seat, rack: [], exposures: [], isBot: seat !== 'east' } satisfies PlayerState,
    ]),
  ) as unknown as Record<Seat, PlayerState>;
  // South has an exposed pung of 5-bams with one joker.
  players.south.exposures.push(
    buildExposure('pung', [fiveBam('sB1'), fiveBam('sB2'), joker('sJ0')], fiveBam('t')),
  );
  return players;
}

describe('validateJokerSwap', () => {
  it('accepts an East offer of matching 5-bam for a joker in South pung', () => {
    const players = makePlayers();
    players.east.rack.push(fiveBam('eB0'));
    const r = validateJokerSwap(players, {
      offeringSeat: 'east',
      offeredTileId: 'eB0',
      targetSeat: 'south',
      exposureIndex: 0,
      jokerId: 'sJ0',
    });
    expect(r.ok).toBe(true);
  });

  it('rejects a non-matching tile', () => {
    const players = makePlayers();
    players.east.rack.push(sixBam('eB6'));
    const r = validateJokerSwap(players, {
      offeringSeat: 'east',
      offeredTileId: 'eB6',
      targetSeat: 'south',
      exposureIndex: 0,
      jokerId: 'sJ0',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects when the offered tile is a joker', () => {
    const players = makePlayers();
    players.east.rack.push(joker('eJ0'));
    const r = validateJokerSwap(players, {
      offeringSeat: 'east',
      offeredTileId: 'eJ0',
      targetSeat: 'south',
      exposureIndex: 0,
      jokerId: 'sJ0',
    });
    expect(r.ok).toBe(false);
  });
});

describe('applyJokerSwap', () => {
  it('moves the joker to East and the natural tile into the pung', () => {
    const players = makePlayers();
    players.east.rack.push(fiveBam('eB0'));
    const next = applyJokerSwap(players, {
      offeringSeat: 'east',
      offeredTileId: 'eB0',
      targetSeat: 'south',
      exposureIndex: 0,
      jokerId: 'sJ0',
    });
    // East rack: joker present, natural gone.
    expect(next.east.rack.find((t) => t.id === 'sJ0')?.kind).toBe('joker');
    expect(next.east.rack.find((t) => t.id === 'eB0')).toBeUndefined();
    // South exposure: joker gone, natural in.
    const ex = next.south.exposures[0]!;
    expect(ex.tiles.find((t) => t.id === 'sJ0')).toBeUndefined();
    expect(ex.tiles.find((t) => t.id === 'eB0')?.kind).toBe('number');
    expect(ex.jokerIds).toHaveLength(0);
  });
});
