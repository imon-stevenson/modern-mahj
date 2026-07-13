import type { BotStrategy } from './base';
import { intermediateBot } from './intermediate';
import {
  computeUsefulness,
  opponentExposureIdentities,
  scoreTile,
  sortRackByUsefulnessAsc,
  tileMatchesKey,
} from './scoring';

// Expert extends intermediate with:
// - Defensive discard: penalize tiles that opponents have already exposed
//   (matching them could lead to a jump/redemption we lose to).
// - Slightly more aggressive Charleston (still uses usefulness ordering but
//   also avoids passing tiles that opponents' exposures suggest they need).

export const expertBot: BotStrategy = {
  ...intermediateBot,

  chooseDiscard(ctx) {
    const use = computeUsefulness(ctx.hands);
    const danger = opponentExposureIdentities(ctx.allExposures, ctx.seat);
    const scored = ctx.rack.map((t) => ({
      tile: t,
      base: scoreTile(t, use),
      dangerous: [...danger].some((k) => tileMatchesKey(t, k)),
    }));
    // Sort: least useful first, and tiles matching opponent exposures LAST
    // (we don't want to discard "into" them).
    scored.sort((a, b) => {
      if (a.dangerous !== b.dangerous) return a.dangerous ? 1 : -1;
      if (a.base !== b.base) return a.base - b.base;
      return a.tile.id.localeCompare(b.tile.id);
    });
    // Never discard a joker.
    const pick = scored.find((s) => s.tile.kind !== 'joker');
    return pick?.tile ?? ctx.rack[0]!;
  },

  chooseCharlestonPass(ctx) {
    const use = computeUsefulness(ctx.hands);
    const sorted = sortRackByUsefulnessAsc(ctx.rack, use).filter(
      (t) => t.kind !== 'joker',
    );
    // Same as intermediate but explicitly avoid the very lowest tile if it
    // matches an opponent's exposure — if opponents' hands need suit X we
    // don't want to feed suit X across.
    const danger = opponentExposureIdentities(ctx.allExposures, ctx.seat);
    const safe = sorted.filter((t) => ![...danger].some((k) => tileMatchesKey(t, k)));
    const picks = (safe.length >= 3 ? safe : sorted).slice(0, 3);
    return picks as [(typeof picks)[number], (typeof picks)[number], (typeof picks)[number]];
  },
};
