import type { BotStrategy } from './base'
import { intermediateBot } from './intermediate'
import { targetHandNeeds } from '../hands/match'
import {
  computeUsefulness,
  opponentExposureIdentities,
  scoreTile,
  sortRackByUsefulnessAsc,
  tileKey,
  tileMatchesKey,
} from './scoring'

// Expert extends intermediate with:
// - Defensive discard: penalize tiles that opponents have already exposed
//   (matching them could lead to a jump/redemption we lose to).
// - Slightly more aggressive Charleston (still uses usefulness ordering but
//   also avoids passing tiles that opponents' exposures suggest they need).

export const expertBot: BotStrategy = {
  ...intermediateBot,

  chooseDiscard(ctx) {
    const use = computeUsefulness(ctx.hands)
    const danger = opponentExposureIdentities(ctx.allExposures, ctx.seat)
    // Tiles our best still-reachable hand (given our exposures) wants — keep them.
    const needs = targetHandNeeds(ctx.rack, ctx.exposures, ctx.hands)
    const scored = ctx.rack.map((t) => ({
      tile: t,
      joker: t.kind === 'joker',
      needed: needs?.has(tileKey(t)) ?? false,
      base: scoreTile(t, use),
      dangerous: [...danger].some((k) => tileMatchesKey(t, k)),
    }))
    // Sort (kept tiles last): never a joker; keep what our committed line needs;
    // avoid discarding "into" an opponent's exposure; else least useful first.
    scored.sort((a, b) => {
      if (a.joker !== b.joker) return a.joker ? 1 : -1
      if (a.needed !== b.needed) return a.needed ? 1 : -1
      if (a.dangerous !== b.dangerous) return a.dangerous ? 1 : -1
      if (a.base !== b.base) return a.base - b.base
      return a.tile.id.localeCompare(b.tile.id)
    })
    return scored[0]?.tile ?? ctx.rack[0]!
  },

  chooseCharlestonPass(ctx) {
    const use = computeUsefulness(ctx.hands)
    const sorted = sortRackByUsefulnessAsc(ctx.rack, use).filter(
      (t) => t.kind !== 'joker',
    )
    // Same as intermediate but explicitly avoid the very lowest tile if it
    // matches an opponent's exposure — if opponents' hands need suit X we
    // don't want to feed suit X across.
    const danger = opponentExposureIdentities(ctx.allExposures, ctx.seat)
    const safe = sorted.filter((t) => ![...danger].some((k) => tileMatchesKey(t, k)))
    const picks = (safe.length >= 3 ? safe : sorted).slice(0, 3)
    return picks as [(typeof picks)[number], (typeof picks)[number], (typeof picks)[number]]
  },
}
