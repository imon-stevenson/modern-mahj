import { describe, expect, it } from 'vitest';
import { createFullTileSet, tileLabel, tilesEqual } from './tiles';

describe('createFullTileSet', () => {
  const tiles = createFullTileSet();

  it('produces exactly 152 tiles', () => {
    expect(tiles).toHaveLength(152);
  });

  it('produces unique ids', () => {
    const ids = new Set(tiles.map((t) => t.id));
    expect(ids.size).toBe(152);
  });

  it('has the right count per category', () => {
    const byKind = tiles.reduce<Record<string, number>>((acc, t) => {
      acc[t.kind] = (acc[t.kind] ?? 0) + 1;
      return acc;
    }, {});
    expect(byKind).toEqual({
      number: 108,
      wind: 16,
      dragon: 12,
      flower: 8,
      joker: 8,
    });
  });

  it('has 4 of every specific number tile', () => {
    const key = (t: (typeof tiles)[number]) =>
      t.kind === 'number' ? `${t.suit}-${t.rank}` : null;
    const counts = new Map<string, number>();
    for (const t of tiles) {
      const k = key(t);
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const count of counts.values()) expect(count).toBe(4);
    expect(counts.size).toBe(27);
  });
});

describe('tileLabel', () => {
  it('renders the shorthand for common tile kinds', () => {
    expect(tileLabel({ id: 'x', kind: 'number', suit: 'bams', rank: 5 })).toBe('5B');
    expect(tileLabel({ id: 'x', kind: 'wind', wind: 'E' })).toBe('EW');
    expect(tileLabel({ id: 'x', kind: 'dragon', color: 'red' })).toBe('RD');
    expect(tileLabel({ id: 'x', kind: 'flower' })).toBe('F');
    expect(tileLabel({ id: 'x', kind: 'joker' })).toBe('J');
  });
});

describe('tilesEqual', () => {
  it('matches by identity, not id', () => {
    expect(
      tilesEqual(
        { id: 'a', kind: 'number', suit: 'bams', rank: 5 },
        { id: 'b', kind: 'number', suit: 'bams', rank: 5 },
      ),
    ).toBe(true);
    expect(
      tilesEqual(
        { id: 'a', kind: 'number', suit: 'bams', rank: 5 },
        { id: 'b', kind: 'number', suit: 'craks', rank: 5 },
      ),
    ).toBe(false);
  });
});
