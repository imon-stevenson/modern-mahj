import { describe, expect, it } from 'vitest';
import { matchHand } from './match';
import type { NMJLHand } from './schema';
import { buildExposure } from '../exposure';
import type { Tile } from '../types';

const n = (suit: 'bams' | 'craks' | 'dots', rank: 1|2|3|4|5|6|7|8|9, id: string): Tile => ({
  id, kind: 'number', suit, rank,
});
const dragon = (color: 'red' | 'green' | 'white', id: string): Tile => ({
  id, kind: 'dragon', color,
});
const flower = (id: string): Tile => ({ id, kind: 'flower' });
const joker = (id: string): Tile => ({ id, kind: 'joker' });
const wind = (w: 'N' | 'E' | 'S' | 'W', id: string): Tile => ({ id, kind: 'wind', wind: w });

const threeSuitsHand: NMJLHand = {
  id: 'h-three',
  section: 'ex',
  line: 1,
  description: 'FF 2222(X) WhiteD-kong 6666(Z), X != Z',
  closed: false,
  value: 25,
  groups: [
    { kind: 'pair', tile: { kind: 'flower' }, jokersAllowed: false },
    { kind: 'kong', tile: { kind: 'number', rank: 2, suitVar: 'X' }, jokersAllowed: true },
    { kind: 'kong', tile: { kind: 'dragon', color: 'white' }, jokersAllowed: true },
    { kind: 'kong', tile: { kind: 'number', rank: 6, suitVar: 'Z' }, jokersAllowed: true },
  ],
  suitConstraints: [{ rule: 'allDifferent', vars: ['X', 'Z'] }],
};

const consecRunHand: NMJLHand = {
  id: 'h-consec',
  section: 'ex',
  line: 2,
  description: 'FF NNNN (N+1)(N+1)(N+1)(N+1) (N+2)(N+2)(N+2)(N+2) (one suit)',
  closed: false,
  value: 25,
  groups: [
    { kind: 'pair', tile: { kind: 'flower' }, jokersAllowed: false },
    { kind: 'kong', tile: { kind: 'number', numVar: 'N', suitVar: 'X' }, jokersAllowed: true },
    { kind: 'kong', tile: { kind: 'number', numVar: 'N+1', suitVar: 'X' }, jokersAllowed: true },
    { kind: 'kong', tile: { kind: 'number', numVar: 'N+2', suitVar: 'X' }, jokersAllowed: true },
  ],
  numberConstraints: [{ rule: 'range', var: 'N', min: 1, max: 7 }],
};

const closedPairsHand: NMJLHand = {
  id: 'h-conc',
  section: 'ex',
  line: 3,
  description: 'seven pairs (closed): 11 22 33 44 55 66 77 (one suit)',
  closed: true,
  value: 25,
  groups: [
    { kind: 'pair', tile: { kind: 'number', rank: 1, suitVar: 'X' }, jokersAllowed: false },
    { kind: 'pair', tile: { kind: 'number', rank: 2, suitVar: 'X' }, jokersAllowed: false },
    { kind: 'pair', tile: { kind: 'number', rank: 3, suitVar: 'X' }, jokersAllowed: false },
    { kind: 'pair', tile: { kind: 'number', rank: 4, suitVar: 'X' }, jokersAllowed: false },
    { kind: 'pair', tile: { kind: 'number', rank: 5, suitVar: 'X' }, jokersAllowed: false },
    { kind: 'pair', tile: { kind: 'number', rank: 6, suitVar: 'X' }, jokersAllowed: false },
    { kind: 'pair', tile: { kind: 'number', rank: 7, suitVar: 'X' }, jokersAllowed: false },
  ],
};

describe('matchHand — three-suits example', () => {
  it('matches when rack fits with bams + white dragons + dots', () => {
    const rack: Tile[] = [
      flower('f0'), flower('f1'),
      n('bams', 2, 'b0'), n('bams', 2, 'b1'), n('bams', 2, 'b2'), n('bams', 2, 'b3'),
      dragon('white', 'w0'), dragon('white', 'w1'), dragon('white', 'w2'), dragon('white', 'w3'),
      n('dots', 6, 'd0'), n('dots', 6, 'd1'), n('dots', 6, 'd2'), n('dots', 6, 'd3'),
    ];
    const r = matchHand(rack, [], threeSuitsHand);
    expect(r).not.toBeNull();
    expect(r?.binding.suits.X).toBe('bams');
    expect(r?.binding.suits.Z).toBe('dots');
  });

  it('does not match if the two suit vars end up the same', () => {
    const rack: Tile[] = [
      flower('f0'), flower('f1'),
      n('bams', 2, 'b0'), n('bams', 2, 'b1'), n('bams', 2, 'b2'), n('bams', 2, 'b3'),
      dragon('white', 'w0'), dragon('white', 'w1'), dragon('white', 'w2'), dragon('white', 'w3'),
      n('bams', 6, 'b6a'), n('bams', 6, 'b6b'), n('bams', 6, 'b6c'), n('bams', 6, 'b6d'),
    ];
    const r = matchHand(rack, [], threeSuitsHand);
    expect(r).toBeNull();
  });

  it('accepts a joker in a kong', () => {
    const rack: Tile[] = [
      flower('f0'), flower('f1'),
      n('bams', 2, 'b0'), n('bams', 2, 'b1'), n('bams', 2, 'b2'), joker('j0'),
      dragon('white', 'w0'), dragon('white', 'w1'), dragon('white', 'w2'), dragon('white', 'w3'),
      n('dots', 6, 'd0'), n('dots', 6, 'd1'), n('dots', 6, 'd2'), n('dots', 6, 'd3'),
    ];
    const r = matchHand(rack, [], threeSuitsHand);
    expect(r).not.toBeNull();
  });

  it('rejects a joker used in the pair', () => {
    const rack: Tile[] = [
      flower('f0'), joker('j0'),
      n('bams', 2, 'b0'), n('bams', 2, 'b1'), n('bams', 2, 'b2'), n('bams', 2, 'b3'),
      dragon('white', 'w0'), dragon('white', 'w1'), dragon('white', 'w2'), dragon('white', 'w3'),
      n('dots', 6, 'd0'), n('dots', 6, 'd1'), n('dots', 6, 'd2'), n('dots', 6, 'd3'),
    ];
    const r = matchHand(rack, [], threeSuitsHand);
    expect(r).toBeNull();
  });

  it('accepts existing exposures that match a group', () => {
    const exposure = buildExposure(
      'kong',
      [n('bams', 2, 'ex0'), n('bams', 2, 'ex1'), joker('exJ'), n('bams', 2, 'ex3')],
      n('bams', 2, 't'),
    );
    const rack: Tile[] = [
      flower('f0'), flower('f1'),
      dragon('white', 'w0'), dragon('white', 'w1'), dragon('white', 'w2'), dragon('white', 'w3'),
      n('dots', 6, 'd0'), n('dots', 6, 'd1'), n('dots', 6, 'd2'), n('dots', 6, 'd3'),
    ];
    const r = matchHand(rack, [exposure], threeSuitsHand);
    expect(r).not.toBeNull();
  });
});

describe('matchHand — consecutive run', () => {
  it('binds N=3, X=craks for a FF+3(4)+4(4)+5(4) rack', () => {
    const rack: Tile[] = [
      flower('f0'), flower('f1'),
      n('craks', 3, 'a0'), n('craks', 3, 'a1'), n('craks', 3, 'a2'), n('craks', 3, 'a3'),
      n('craks', 4, 'b0'), n('craks', 4, 'b1'), n('craks', 4, 'b2'), n('craks', 4, 'b3'),
      n('craks', 5, 'c0'), n('craks', 5, 'c1'), n('craks', 5, 'c2'), n('craks', 5, 'c3'),
    ];
    const r = matchHand(rack, [], consecRunHand);
    expect(r).not.toBeNull();
    expect(r?.binding.numbers.N).toBe(3);
    expect(r?.binding.suits.X).toBe('craks');
  });

  it('rejects a non-consecutive rack (2, 4, 6)', () => {
    const rack: Tile[] = [
      flower('f0'), flower('f1'),
      n('craks', 2, 'a0'), n('craks', 2, 'a1'), n('craks', 2, 'a2'), n('craks', 2, 'a3'),
      n('craks', 4, 'b0'), n('craks', 4, 'b1'), n('craks', 4, 'b2'), n('craks', 4, 'b3'),
      n('craks', 6, 'c0'), n('craks', 6, 'c1'), n('craks', 6, 'c2'), n('craks', 6, 'c3'),
    ];
    expect(matchHand(rack, [], consecRunHand)).toBeNull();
  });
});

describe('matchHand — closed pair hand', () => {
  it('matches a valid closed 7-pairs rack', () => {
    const rack: Tile[] = [
      n('bams', 1, 'a'), n('bams', 1, 'b'),
      n('bams', 2, 'c'), n('bams', 2, 'd'),
      n('bams', 3, 'e'), n('bams', 3, 'f'),
      n('bams', 4, 'g'), n('bams', 4, 'h'),
      n('bams', 5, 'i'), n('bams', 5, 'j'),
      n('bams', 6, 'k'), n('bams', 6, 'l'),
      n('bams', 7, 'm'), n('bams', 7, 'n'),
    ];
    const r = matchHand(rack, [], closedPairsHand);
    expect(r).not.toBeNull();
  });

  it('rejects the same rack if the hand had an exposure', () => {
    const rack: Tile[] = [
      n('bams', 1, 'a'), n('bams', 1, 'b'),
      n('bams', 2, 'c'), n('bams', 2, 'd'),
      n('bams', 3, 'e'), n('bams', 3, 'f'),
      n('bams', 4, 'g'), n('bams', 4, 'h'),
      n('bams', 5, 'i'), n('bams', 5, 'j'),
      n('bams', 6, 'k'), n('bams', 6, 'l'),
    ];
    const ex = buildExposure(
      'pair',
      [n('bams', 7, 'x'), n('bams', 7, 'y')],
      n('bams', 7, 't'),
    );
    const r = matchHand(rack, [ex], closedPairsHand);
    expect(r).toBeNull();
  });

  it('rejects if a required pair is missing', () => {
    const rack: Tile[] = [
      n('bams', 1, 'a'), n('bams', 1, 'b'),
      n('bams', 2, 'c'), n('bams', 2, 'd'),
      n('bams', 3, 'e'), n('bams', 3, 'f'),
      n('bams', 4, 'g'), n('bams', 4, 'h'),
      n('bams', 5, 'i'), n('bams', 5, 'j'),
      n('bams', 6, 'k'), n('bams', 6, 'l'),
      wind('E', 'wrong1'), wind('E', 'wrong2'),
    ];
    const r = matchHand(rack, [], closedPairsHand);
    expect(r).toBeNull();
  });
});
