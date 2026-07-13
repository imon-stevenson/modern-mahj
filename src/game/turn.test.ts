import { describe, expect, it } from 'vitest';
import {
  matchingInRack,
  nextSeat,
  possibleCallsForDiscard,
  removeTileById,
  resolveCallPriority,
  takeMatchingFromRack,
  tilesForCall,
} from './turn';
import type { Tile } from './types';

const fiveBam = (id: string): Tile => ({ id, kind: 'number', suit: 'bams', rank: 5 });
const sixBam = (id: string): Tile => ({ id, kind: 'number', suit: 'bams', rank: 6 });
const joker = (id: string): Tile => ({ id, kind: 'joker' });

describe('nextSeat', () => {
  it('rotates east → north → west → south → east', () => {
    expect(nextSeat('east')).toBe('north');
    expect(nextSeat('north')).toBe('west');
    expect(nextSeat('west')).toBe('south');
    expect(nextSeat('south')).toBe('east');
  });
});

describe('matchingInRack', () => {
  it('counts only non-joker exact matches', () => {
    const rack: Tile[] = [fiveBam('a'), fiveBam('b'), sixBam('c'), joker('j0')];
    expect(matchingInRack(rack, fiveBam('t'))).toBe(2);
    expect(matchingInRack(rack, sixBam('t'))).toBe(1);
  });
});

describe('possibleCallsForDiscard', () => {
  it('returns pung with 2, pung+kong with 3', () => {
    expect(
      possibleCallsForDiscard([fiveBam('a'), fiveBam('b')], fiveBam('t')),
    ).toEqual(['pung']);
    expect(
      possibleCallsForDiscard(
        [fiveBam('a'), fiveBam('b'), fiveBam('c')],
        fiveBam('t'),
      ),
    ).toEqual(['pung', 'kong']);
    expect(possibleCallsForDiscard([fiveBam('a')], fiveBam('t'))).toEqual([]);
  });
});

describe('resolveCallPriority', () => {
  it('mahjong always wins', () => {
    const winner = resolveCallPriority('east', [
      { seat: 'south', kind: 'pung' },
      { seat: 'west', kind: 'mahjong' },
    ]);
    expect(winner?.kind).toBe('mahjong');
  });

  it('breaks non-mahjong ties by play-order distance from the discarder', () => {
    const winner = resolveCallPriority('east', [
      { seat: 'south', kind: 'pung' },
      { seat: 'north', kind: 'pung' },
    ]);
    // From east, order is north(1), west(2), south(3). North wins.
    expect(winner?.seat).toBe('north');
  });

  it('returns null with no requests', () => {
    expect(resolveCallPriority('east', [])).toBeNull();
  });
});

describe('takeMatchingFromRack', () => {
  it('takes the requested count and returns the rest', () => {
    const rack: Tile[] = [fiveBam('a'), fiveBam('b'), fiveBam('c'), sixBam('d')];
    const { taken, rack: rest } = takeMatchingFromRack(rack, fiveBam('t'), 2);
    expect(taken.map((t) => t.id)).toEqual(['a', 'b']);
    expect(rest.map((t) => t.id)).toEqual(['c', 'd']);
  });

  it('throws if not enough matching tiles', () => {
    expect(() => takeMatchingFromRack([fiveBam('a')], fiveBam('t'), 2)).toThrow();
  });
});

describe('removeTileById', () => {
  it('removes the matching id', () => {
    const rack: Tile[] = [fiveBam('a'), sixBam('b')];
    expect(removeTileById(rack, 'a').map((t) => t.id)).toEqual(['b']);
  });
  it('throws on missing id', () => {
    expect(() => removeTileById([fiveBam('a')], 'z')).toThrow();
  });
});

describe('tilesForCall', () => {
  it('returns discard + 2 rack tiles for a pung', () => {
    const rack: Tile[] = [fiveBam('a'), fiveBam('b'), sixBam('c')];
    const t = tilesForCall('pung', fiveBam('discard'), rack);
    expect(t.fromDiscard.id).toBe('discard');
    expect(t.fromRack.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('returns discard + 3 rack tiles for a kong', () => {
    const rack: Tile[] = [fiveBam('a'), fiveBam('b'), fiveBam('c'), sixBam('d')];
    const t = tilesForCall('kong', fiveBam('discard'), rack);
    expect(t.fromRack).toHaveLength(3);
  });
});
