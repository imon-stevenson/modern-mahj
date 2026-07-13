import { describe, expect, it } from 'vitest';
import { buildExposure, validateExposure } from './exposure';
import type { Tile } from './types';

const fiveBam = (id: string): Tile => ({ id, kind: 'number', suit: 'bams', rank: 5 });
const joker = (id: string): Tile => ({ id, kind: 'joker' });
const flower = (id: string): Tile => ({ id, kind: 'flower' });

describe('validateExposure', () => {
  it('accepts a natural pung of three 5-bam', () => {
    const r = validateExposure(
      'pung',
      [fiveBam('a'), fiveBam('b'), fiveBam('c')],
      fiveBam('t'),
    );
    expect(r.ok).toBe(true);
  });

  it('accepts a pung with one joker substituting', () => {
    const r = validateExposure(
      'pung',
      [fiveBam('a'), fiveBam('b'), joker('j0')],
      fiveBam('t'),
    );
    expect(r.ok).toBe(true);
  });

  it('accepts a kong of four with two jokers', () => {
    const r = validateExposure(
      'kong',
      [fiveBam('a'), fiveBam('b'), joker('j0'), joker('j1')],
      fiveBam('t'),
    );
    expect(r.ok).toBe(true);
  });

  it('rejects a pair with a joker', () => {
    const r = validateExposure('pair', [flower('f0'), joker('j0')], flower('t'));
    expect(r.ok).toBe(false);
  });

  it('rejects a pung whose natural tile identity differs from the target', () => {
    const r = validateExposure(
      'pung',
      [fiveBam('a'), fiveBam('b'), { id: 'x', kind: 'number', suit: 'craks', rank: 5 }],
      fiveBam('t'),
    );
    expect(r.ok).toBe(false);
  });

  it('rejects the wrong number of tiles', () => {
    const r = validateExposure('pung', [fiveBam('a'), fiveBam('b')], fiveBam('t'));
    expect(r.ok).toBe(false);
  });
});

describe('buildExposure', () => {
  it('records the joker ids used in the exposure', () => {
    const ex = buildExposure(
      'kong',
      [fiveBam('a'), joker('j0'), joker('j1'), fiveBam('b')],
      fiveBam('t'),
    );
    expect(ex.jokerIds).toEqual(['j0', 'j1']);
    expect(ex.kind).toBe('kong');
  });

  it('throws on an invalid group', () => {
    expect(() => buildExposure('pair', [joker('j0'), joker('j1')], flower('t'))).toThrow();
  });
});
