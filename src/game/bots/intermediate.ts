import type { CallKind, Exposure, ExposureKind, Tile } from "../types"
import type { BotStrategy } from "./base"
import type { JokerSwapOffer } from "../jokerSwap"
import {
  bestExposureAwareCloseness,
  matchAgainstAll,
  targetHandNeeds,
} from "../hands/match"
import { buildExposure } from "../exposure"
import { tilesForCall } from "../turn"
import {
  computeUsefulness,
  handCloseness,
  scoreTile,
  sortRackByUsefulnessAsc,
  tileKey,
  topHands,
} from "./scoring"
import { exposureIdentity } from "../jokerSwap"
import { tilesEqual } from "../tiles"

export const intermediateBot: BotStrategy = {
  chooseCharlestonPass(ctx) {
    const use = computeUsefulness(ctx.hands)
    const sorted = sortRackByUsefulnessAsc(ctx.rack, use).filter(
      (t) => t.kind !== "joker",
    )
    const picks = sorted.slice(0, 3)
    return picks as [Tile, Tile, Tile]
  },
  wantsSecondCharleston(ctx) {
    // If our closest hand is less than 75% filled, keep passing.
    const [best] = topHands(ctx.rack, ctx.hands, 1)
    if (!best) return false
    return handCloseness(ctx.rack, best) < 0.75
  },
  chooseCourtesyCount(ctx) {
    // The further along our best hand is, the fewer tiles we want to give away.
    const [best] = topHands(ctx.rack, ctx.hands, 1)
    const closeness = best ? handCloseness(ctx.rack, best) : 0
    if (closeness < 0.4) return 3
    if (closeness < 0.6) return 2
    if (closeness < 0.8) return 1
    return 0
  },
  chooseCourtesyPass(ctx, maxCount) {
    const use = computeUsefulness(ctx.hands)
    const sorted = sortRackByUsefulnessAsc(ctx.rack, use).filter(
      (t) => t.kind !== "joker",
    )
    return sorted.slice(0, maxCount)
  },
  chooseDiscard(ctx) {
    const use = computeUsefulness(ctx.hands)
    // Tiles the best hand still reachable given our exposures actually wants —
    // keep those, discard tiles that don't advance our committed line.
    const needs = targetHandNeeds(ctx.rack, ctx.exposures, ctx.hands)
    const ranked = [...ctx.rack].sort((a, b) => {
      const ja = a.kind === "joker"
      const jb = b.kind === "joker"
      if (ja !== jb) return ja ? 1 : -1 // never discard a joker
      const na = needs?.has(tileKey(a)) ?? false
      const nb = needs?.has(tileKey(b)) ?? false
      if (na !== nb) return na ? 1 : -1 // keep tiles the target hand needs
      const ua = scoreTile(a, use)
      const ub = scoreTile(b, use)
      if (ua !== ub) return ua - ub // then least globally useful first
      return a.id.localeCompare(b.id)
    })
    return ranked[0] ?? ctx.rack[0]!
  },
  decideCall(ctx, discard, available): CallKind | null {
    // Mahjong first.
    const trialRack = [...ctx.rack, discard]
    if (matchAgainstAll(trialRack, ctx.exposures, ctx.hands)) return "mahjong"

    if (available.length === 0) return null

    // Exposure-aware: a call is only worth making if, AFTER committing the new
    // exposure, some real hand is still reachable given ALL our exposures, and
    // it advances us. This stops bots from stacking mutually-incompatible pungs
    // that no card line can use.
    const before =
      bestExposureAwareCloseness(ctx.rack, ctx.exposures, ctx.hands) ?? 0
    const rankChoice: CallKind[] = ["kong", "pung"]
    for (const kind of rankChoice) {
      if (!available.includes(kind)) continue
      const fromRack = tilesForCall(
        kind as Exclude<CallKind, "mahjong">,
        discard,
        ctx.rack,
      ).fromRack
      const prospective: Exposure[] = [
        ...ctx.exposures,
        buildExposure(kind as ExposureKind, [discard, ...fromRack], discard),
      ]
      const usedIds = new Set(fromRack.map((t) => t.id))
      const rackAfter = ctx.rack.filter((t) => !usedIds.has(t.id))
      // null ⇒ the new exposure fits no reachable hand: never make it.
      const after = bestExposureAwareCloseness(
        rackAfter,
        prospective,
        ctx.hands,
      )
      if (after !== null && after > before) return kind
    }
    return null
  },
  wantsJokerSwap(ctx): JokerSwapOffer | null {
    // Look through every exposure for a joker whose identity we hold as a
    // natural tile. Take the first one—greedy but reasonable.
    for (const seat of Object.keys(
      ctx.allExposures,
    ) as (keyof typeof ctx.allExposures)[]) {
      const exposures = ctx.allExposures[seat]
      for (let i = 0; i < exposures.length; i++) {
        const ex: Exposure = exposures[i]!
        if (ex.jokerIds.length === 0) continue
        const identity = exposureIdentity(ex)
        if (!identity) continue
        const rackTile = ctx.rack.find(
          (t) => t.kind !== "joker" && tilesEqual(t, identity),
        )
        if (!rackTile) continue
        return {
          offeringSeat: ctx.seat,
          offeredTileId: rackTile.id,
          targetSeat: seat,
          exposureIndex: i,
          jokerId: ex.jokerIds[0]!,
        }
      }
    }
    return null
  },
}
