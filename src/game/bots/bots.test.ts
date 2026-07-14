import { describe, expect, it } from 'vitest';
import { beginnerBot, botFor, expertBot, intermediateBot } from './index';
import type { BotCtx } from './base';
import type { Exposure, Seat, Tile } from '../types';
import { SEATS } from '../types';
import type { NMJLHand } from '../hands/schema';
import { createRng } from '../rng';
import { buildExposure } from '../exposure';

const n = (suit: 'bams' | 'craks' | 'dots', rank: 1|2|3|4|5|6|7|8|9, id: string): Tile => ({
  id, kind: 'number', suit, rank,
});
const flower = (id: string): Tile => ({ id, kind: 'flower' });
const joker = (id: string): Tile => ({ id, kind: 'joker' });

const winsHand: NMJLHand = {
  id: 'wins',
  section: 'ex',
  line: 1,
  description: 'FF 2222(X) 6666(X) 8888(X) — one suit throughout',
  closed: false,
  value: 25,
  groups: [
    { kind: 'pair', tile: { kind: 'flower' }, jokersAllowed: false },
    { kind: 'kong', tile: { kind: 'number', rank: 2, suitVar: 'X' }, jokersAllowed: true },
    { kind: 'kong', tile: { kind: 'number', rank: 6, suitVar: 'X' }, jokersAllowed: true },
    { kind: 'kong', tile: { kind: 'number', rank: 8, suitVar: 'X' }, jokersAllowed: true },
  ],
};

function ctx(overrides: Partial<BotCtx> = {}): BotCtx {
  const emptyExposures: Record<Seat, Exposure[]> = Object.fromEntries(
    SEATS.map((s) => [s, [] as Exposure[]]),
  ) as Record<Seat, Exposure[]>;
  return {
    seat: 'south',
    rack: [],
    exposures: [],
    allExposures: emptyExposures,
    discardPile: [],
    hands: [winsHand],
    rng: createRng(1),
    ...overrides,
  };
}

describe('botFor factory', () => {
  it('returns the right bot per difficulty', () => {
    expect(botFor('beginner')).toBe(beginnerBot);
    expect(botFor('intermediate')).toBe(intermediateBot);
    expect(botFor('expert')).toBe(expertBot);
  });
});

describe('beginner bot', () => {
  it('never calls pung/kong', () => {
    const rack = [n('bams', 5, 'a'), n('bams', 5, 'b'), n('bams', 5, 'c')];
    const call = beginnerBot.decideCall(ctx({ rack }), n('bams', 5, 'discard'), ['pung', 'kong']);
    expect(call).toBeNull();
  });

  it('never offers a joker swap', () => {
    expect(beginnerBot.wantsJokerSwap(ctx())).toBeNull();
  });

  it('discards a non-joker if any are available', () => {
    const rack = [joker('j0'), n('bams', 5, 'a')];
    const t = beginnerBot.chooseDiscard(ctx({ rack }));
    expect(t.kind).not.toBe('joker');
  });
});

describe('intermediate bot', () => {
  it('discards the least-useful tile relative to the hands list', () => {
    // Rack has 2 flowers (useful — pair kind requires them) and 1 useless tile
    // that doesn't appear in the winning hand.
    const rack = [flower('f0'), flower('f1'), n('craks', 1, 'wasted')];
    const t = intermediateBot.chooseDiscard(ctx({ rack }));
    expect(t.id).toBe('wasted');
  });

  it('picks Mahjong when it can', () => {
    const rack: Tile[] = [
      flower('f0'), flower('f1'),
      n('bams', 2, 'a'), n('bams', 2, 'b'), n('bams', 2, 'c'), n('bams', 2, 'd'),
      n('bams', 6, 'e'), n('bams', 6, 'f'), n('bams', 6, 'g'), n('bams', 6, 'h'),
      n('bams', 8, 'i'), n('bams', 8, 'j'), n('bams', 8, 'k'),
    ];
    const call = intermediateBot.decideCall(
      ctx({ rack }),
      n('bams', 8, 'discard'),
      ['pung'],
    );
    expect(call).toBe('mahjong');
  });

  it('offers a joker swap when it holds the matching natural', () => {
    const bamsPung = buildExposure(
      'pung',
      [n('bams', 5, 'e0'), n('bams', 5, 'e1'), joker('exJ')],
      n('bams', 5, 't'),
    );
    const allExposures = {
      east: [],
      south: [],
      west: [bamsPung],
      north: [],
    } as Record<Seat, Exposure[]>;
    const swap = intermediateBot.wantsJokerSwap(
      ctx({ rack: [n('bams', 5, 'mine')], allExposures }),
    );
    expect(swap?.jokerId).toBe('exJ');
    expect(swap?.targetSeat).toBe('west');
  });
});

describe('expert bot', () => {
  it('prefers not to discard tiles matching opponents\' exposures', () => {
    const opponentPung = buildExposure(
      'pung',
      [n('bams', 5, 'e0'), n('bams', 5, 'e1'), n('bams', 5, 'e2')],
      n('bams', 5, 't'),
    );
    const allExposures = {
      east: [],
      south: [],
      west: [opponentPung],
      north: [],
    } as Record<Seat, Exposure[]>;
    const rack = [n('bams', 5, 'mine'), n('craks', 3, 'safe')];
    const t = expertBot.chooseDiscard(ctx({ rack, allExposures }));
    expect(t.id).toBe('safe');
  });
});
