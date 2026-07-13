import type { CallKind, Exposure, Tile } from '../types';
import type { BotStrategy } from './base';
import type { JokerSwapOffer } from '../jokerSwap';
import { matchAgainstAll } from '../hands/match';
import { computeUsefulness, handCloseness, sortRackByUsefulnessAsc, topHands } from './scoring';
import { exposureIdentity } from '../jokerSwap';
import { tilesEqual } from '../tiles';

export const intermediateBot: BotStrategy = {
  chooseCharlestonPass(ctx) {
    const use = computeUsefulness(ctx.hands);
    const sorted = sortRackByUsefulnessAsc(ctx.rack, use).filter((t) => t.kind !== 'joker');
    const picks = sorted.slice(0, 3);
    return picks as [Tile, Tile, Tile];
  },
  wantsSecondCharleston(ctx) {
    // If our closest hand is less than 50% filled, keep passing.
    const [best] = topHands(ctx.rack, ctx.hands, 1);
    if (!best) return false;
    return handCloseness(ctx.rack, best) < 0.5;
  },
  chooseCourtesyPass(ctx, maxCount) {
    const use = computeUsefulness(ctx.hands);
    const sorted = sortRackByUsefulnessAsc(ctx.rack, use).filter((t) => t.kind !== 'joker');
    return sorted.slice(0, maxCount);
  },
  chooseDiscard(ctx) {
    const use = computeUsefulness(ctx.hands);
    const sorted = sortRackByUsefulnessAsc(ctx.rack, use);
    return sorted[0] ?? ctx.rack[0]!;
  },
  decideCall(ctx, discard, available): CallKind | null {
    // Mahjong first.
    const trialRack = [...ctx.rack, discard];
    if (matchAgainstAll(trialRack, ctx.exposures, ctx.hands)) return 'mahjong';

    if (available.length === 0) return null;

    const [beforeBest] = topHands(ctx.rack, ctx.hands, 1);
    const before = beforeBest ? handCloseness(ctx.rack, beforeBest) : 0;
    // If a pung/kong strictly improves our closeness on our best hand target,
    // take it. Prefer kong when available (more tiles committed).
    const rankChoice: CallKind[] = ['kong', 'pung'];
    for (const kind of rankChoice) {
      if (!available.includes(kind)) continue;
      // Simulate taking N natural matches out of the rack; discard identity
      // moves to an exposure (doesn't stay in rack). We approximate the effect
      // on closeness by adding the discard back and re-scoring.
      const [afterBest] = topHands(trialRack, ctx.hands, 1);
      const after = afterBest ? handCloseness(trialRack, afterBest) : 0;
      if (after > before) return kind;
    }
    return null;
  },
  wantsJokerSwap(ctx): JokerSwapOffer | null {
    // Look through every exposure for a joker whose identity we hold as a
    // natural tile. Take the first one — greedy but reasonable.
    for (const seat of Object.keys(ctx.allExposures) as (keyof typeof ctx.allExposures)[]) {
      const exposures = ctx.allExposures[seat];
      for (let i = 0; i < exposures.length; i++) {
        const ex: Exposure = exposures[i]!;
        if (ex.jokerIds.length === 0) continue;
        const identity = exposureIdentity(ex);
        if (!identity) continue;
        const rackTile = ctx.rack.find((t) => t.kind !== 'joker' && tilesEqual(t, identity));
        if (!rackTile) continue;
        return {
          offeringSeat: ctx.seat,
          offeredTileId: rackTile.id,
          targetSeat: seat,
          exposureIndex: i,
          jokerId: ex.jokerIds[0]!,
        };
      }
    }
    return null;
  },
};
