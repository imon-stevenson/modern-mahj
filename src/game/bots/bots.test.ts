import { describe, expect, it } from "vitest"
import { beginnerBot, botFor, expertBot, intermediateBot } from "./index"
import type { BotCtx } from "./base"
import type { Exposure, Seat, Tile } from "../types"
import { SEATS } from "../types"
import type { NMJLHand } from "../hands/schema"
import { createRng } from "../rng"
import { buildExposure } from "../exposure"

const n = (
  suit: "bams" | "craks" | "dots",
  rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
  id: string,
): Tile => ({
  id,
  kind: "number",
  suit,
  rank,
})
const flower = (id: string): Tile => ({ id, kind: "flower" })
const joker = (id: string): Tile => ({ id, kind: "joker" })

const winsHand: NMJLHand = {
  id: "wins",
  section: "ex",
  line: 1,
  description: "FF 2222(X) 6666(X) 8888(X)—one suit throughout",
  closed: false,
  value: 25,
  groups: [
    { kind: "pair", tile: { kind: "flower" }, jokersAllowed: false },
    {
      kind: "kong",
      tile: { kind: "number", rank: 2, suitVar: "X" },
      jokersAllowed: true,
    },
    {
      kind: "kong",
      tile: { kind: "number", rank: 6, suitVar: "X" },
      jokersAllowed: true,
    },
    {
      kind: "kong",
      tile: { kind: "number", rank: 8, suitVar: "X" },
      jokersAllowed: true,
    },
  ],
}

function ctx(overrides: Partial<BotCtx> = {}): BotCtx {
  const emptyExposures: Record<Seat, Exposure[]> = Object.fromEntries(
    SEATS.map((s) => [s, [] as Exposure[]]),
  ) as Record<Seat, Exposure[]>
  return {
    seat: "south",
    rack: [],
    exposures: [],
    allExposures: emptyExposures,
    discardPile: [],
    hands: [winsHand],
    rng: createRng(1),
    ...overrides,
  }
}

describe("botFor factory", () => {
  it("returns the right bot per difficulty", () => {
    expect(botFor("beginner")).toBe(beginnerBot)
    expect(botFor("intermediate")).toBe(intermediateBot)
    expect(botFor("expert")).toBe(expertBot)
  })
})

describe("beginner bot", () => {
  it("never calls pung/kong", () => {
    const rack = [n("bams", 5, "a"), n("bams", 5, "b"), n("bams", 5, "c")]
    const call = beginnerBot.decideCall(
      ctx({ rack }),
      n("bams", 5, "discard"),
      ["pung", "kong"],
    )
    expect(call).toBeNull()
  })

  it("never offers a joker swap", () => {
    expect(beginnerBot.wantsJokerSwap(ctx())).toBeNull()
  })

  it("offers up to maxCount (non-joker) tiles for the courtesy pass", () => {
    const rack = [
      joker("j0"),
      n("bams", 1, "a"),
      n("bams", 2, "b"),
      n("craks", 3, "c"),
    ]
    const picks = beginnerBot.chooseCourtesyPass(ctx({ rack }), 3)
    expect(picks).toHaveLength(3)
    expect(picks.every((t) => t.kind !== "joker")).toBe(true)
  })

  it("picks a courtesy count in [0, 3]", () => {
    const count = beginnerBot.chooseCourtesyCount(ctx())
    expect(count).toBeGreaterThanOrEqual(0)
    expect(count).toBeLessThanOrEqual(3)
  })

  it("discards a non-joker if any are available", () => {
    const rack = [joker("j0"), n("bams", 5, "a")]
    const t = beginnerBot.chooseDiscard(ctx({ rack }))
    expect(t.kind).not.toBe("joker")
  })
})

describe("intermediate bot", () => {
  // The Charleston pass is ranked against the bot's OWN rack, not against a
  // card-global usefulness table. A global table scores every seat's tiles
  // identically, so all three bots shed the same kinds of tile and a tile that
  // ranked lowest for the sender ranks lowest for the receiver too—junk just
  // relays around the table into the human's rack.
  it("will not break up a pair to shed a tile the card rates lower", () => {
    // winsHand is FF 2222(X) 6666(X) 8888(X), so 5-crak appears in it under no
    // suit binding at all—its card-global score is zero, same as the 9-bam.
    // Ranking by that global score alone therefore passes BOTH 5-craks and
    // splits the pair. A pair is the raw material of a pung, so it should
    // outrank the lone dots even though the dots score higher on the card.
    const rack = [
      n("craks", 5, "pair-a"),
      n("craks", 5, "pair-b"),
      n("dots", 2, "dot-two"),
      n("dots", 6, "dot-six"),
      n("dots", 8, "dot-eight"),
      n("bams", 9, "nine-bam"),
    ]
    const passedIds = intermediateBot
      .chooseCharlestonPass(ctx({ rack }))
      .map((t) => t.id)
    expect(passedIds).not.toContain("pair-a")
    expect(passedIds).not.toContain("pair-b")
    expect(passedIds).toContain("nine-bam")
  })

  it("passes the same tile from one rack and keeps it in another", () => {
    // Identical tile, identical card, opposite decision—driven only by the rest
    // of the rack. computeUsefulness scores n:bams:2 and n:craks:2 identically
    // under a suit-variable hand, so the old card-global ranking had to break
    // that tie on tile id; it could not let the rack decide.
    // Both racks are three pairs of 2/6/8 in one suit plus a lone 2/6/8 in the
    // other. Only the suits are swapped, so the two racks are mirror images and
    // every tile carries the same card-global score in both.
    const crakRack = [
      n("craks", 2, "committed-a"),
      n("craks", 2, "committed-b"),
      n("craks", 6, "committed-c"),
      n("craks", 6, "committed-d"),
      n("craks", 8, "committed-e"),
      n("craks", 8, "committed-f"),
      n("bams", 2, "two-bam"),
      n("bams", 6, "six-bam"),
      n("bams", 8, "eight-bam"),
    ]
    const bamRack = [
      n("bams", 2, "committed-a"),
      n("bams", 2, "committed-b"),
      n("bams", 6, "committed-c"),
      n("bams", 6, "committed-d"),
      n("bams", 8, "committed-e"),
      n("bams", 8, "committed-f"),
      n("craks", 2, "two-crak"),
      n("craks", 6, "six-crak"),
      n("craks", 8, "eight-crak"),
    ]

    const fromCrakRack = intermediateBot
      .chooseCharlestonPass(ctx({ rack: crakRack }))
      .map((t) => t.id)
    const fromBamRack = intermediateBot
      .chooseCharlestonPass(ctx({ rack: bamRack }))
      .map((t) => t.id)

    // The crak-committed rack sheds its bams; the bam-committed rack keeps them
    // and sheds craks instead. Same tile identities, opposite fate.
    expect(fromCrakRack.sort()).toEqual(["eight-bam", "six-bam", "two-bam"])
    expect(fromBamRack.sort()).toEqual(["eight-crak", "six-crak", "two-crak"])
  })

  it("discards the least-useful tile relative to the hands list", () => {
    // Rack has 2 flowers (useful—pair kind requires them) and 1 useless tile
    // that doesn't appear in the winning hand.
    const rack = [flower("f0"), flower("f1"), n("craks", 1, "wasted")]
    const t = intermediateBot.chooseDiscard(ctx({ rack }))
    expect(t.id).toBe("wasted")
  })

  it("discards toward its committed line, keeping tiles that line needs", () => {
    // Exposed a kong of 2-bams → committed to winsHand in bams. The 8-bam
    // completes it (keep); the 6-craks is only useful to winsHand in a suit we
    // can no longer take, so discard it even though global usefulness ties them.
    const kong2bam = buildExposure(
      "kong",
      [
        n("bams", 2, "e0"),
        n("bams", 2, "e1"),
        n("bams", 2, "e2"),
        n("bams", 2, "e3"),
      ],
      n("bams", 2, "t"),
    )
    const rack = [n("bams", 8, "keep"), n("craks", 6, "toss")]
    const t = intermediateBot.chooseDiscard(
      ctx({ rack, exposures: [kong2bam] }),
    )
    expect(t.id).toBe("toss")
  })

  it("calls kong toward a real target hand", () => {
    // Three 2-bams + a discarded 2-bam completes winsHand's kong of 2s.
    const rack = [n("bams", 2, "a"), n("bams", 2, "b"), n("bams", 2, "c")]
    const call = intermediateBot.decideCall(
      ctx({ rack }),
      n("bams", 2, "discard"),
      ["kong"],
    )
    expect(call).toBe("kong")
  })

  it("will not stack an exposure incompatible with its existing ones", () => {
    // Already committed to a kong of 2-CRAKS (toward the one-suit winsHand in
    // craks). A kong of 6-BAMS can share no hand with it, so it must decline —
    // this is the "bots exposing unrelated pungs" bug.
    const kong2crak = buildExposure(
      "kong",
      [
        n("craks", 2, "e0"),
        n("craks", 2, "e1"),
        n("craks", 2, "e2"),
        n("craks", 2, "e3"),
      ],
      n("craks", 2, "t"),
    )
    const rack = [n("bams", 6, "a"), n("bams", 6, "b"), n("bams", 6, "c")]
    const call = intermediateBot.decideCall(
      ctx({ rack, exposures: [kong2crak] }),
      n("bams", 6, "discard"),
      ["kong"],
    )
    expect(call).toBeNull()
  })

  it("picks Mahjong when it can", () => {
    const rack: Tile[] = [
      flower("f0"),
      flower("f1"),
      n("bams", 2, "a"),
      n("bams", 2, "b"),
      n("bams", 2, "c"),
      n("bams", 2, "d"),
      n("bams", 6, "e"),
      n("bams", 6, "f"),
      n("bams", 6, "g"),
      n("bams", 6, "h"),
      n("bams", 8, "i"),
      n("bams", 8, "j"),
      n("bams", 8, "k"),
    ]
    const call = intermediateBot.decideCall(
      ctx({ rack }),
      n("bams", 8, "discard"),
      ["pung"],
    )
    expect(call).toBe("mahjong")
  })

  it("offers its least-useful tiles for the courtesy pass, never a joker", () => {
    const rack = [
      joker("j0"),
      flower("f0"),
      flower("f1"),
      n("craks", 1, "wasted"),
    ]
    const picks = intermediateBot.chooseCourtesyPass(ctx({ rack }), 3)
    expect(picks.length).toBeGreaterThan(0)
    expect(picks.every((t) => t.kind !== "joker")).toBe(true)
    // The useless craks tile (not in the winning hand) should be offered first.
    expect(picks[0]!.id).toBe("wasted")
  })

  it("offers fewer courtesy tiles as its hand fills up", () => {
    // A rack with all four flowers + three of each needed kong is far along the
    // winsHand target, so the bot should be reluctant to give tiles away.
    const strongRack: Tile[] = [
      flower("f0"),
      flower("f1"),
      n("bams", 2, "a"),
      n("bams", 2, "b"),
      n("bams", 2, "c"),
      n("bams", 2, "d"),
      n("bams", 6, "e"),
      n("bams", 6, "f"),
      n("bams", 6, "g"),
      n("bams", 6, "h"),
      n("bams", 8, "i"),
      n("bams", 8, "j"),
      n("bams", 8, "k"),
    ]
    const weakRack: Tile[] = [
      n("craks", 1, "a"),
      n("craks", 3, "b"),
      n("dots", 5, "c"),
      n("dots", 7, "d"),
    ]
    const strong = intermediateBot.chooseCourtesyCount(
      ctx({ rack: strongRack }),
    )
    const weak = intermediateBot.chooseCourtesyCount(ctx({ rack: weakRack }))
    expect(strong).toBeLessThan(weak)
    expect(weak).toBe(3)
  })

  it("offers a joker swap when it holds the matching natural", () => {
    const bamsPung = buildExposure(
      "pung",
      [n("bams", 5, "e0"), n("bams", 5, "e1"), joker("exJ")],
      n("bams", 5, "t"),
    )
    const allExposures = {
      east: [],
      south: [],
      west: [bamsPung],
      north: [],
    } as Record<Seat, Exposure[]>
    const swap = intermediateBot.wantsJokerSwap(
      ctx({ rack: [n("bams", 5, "mine")], allExposures }),
    )
    expect(swap?.jokerId).toBe("exJ")
    expect(swap?.targetSeat).toBe("west")
  })
})

describe("expert bot", () => {
  it("inherits the exposure-aware call gate from intermediate", () => {
    expect(expertBot.decideCall).toBe(intermediateBot.decideCall)
    // ...and behaves accordingly: declines a kong incompatible with its exposure.
    const kong2crak = buildExposure(
      "kong",
      [
        n("craks", 2, "e0"),
        n("craks", 2, "e1"),
        n("craks", 2, "e2"),
        n("craks", 2, "e3"),
      ],
      n("craks", 2, "t"),
    )
    const rack = [n("bams", 6, "a"), n("bams", 6, "b"), n("bams", 6, "c")]
    expect(
      expertBot.decideCall(
        ctx({ rack, exposures: [kong2crak] }),
        n("bams", 6, "discard"),
        ["kong"],
      ),
    ).toBeNull()
  })

  it("discards toward its committed line too (exposure-aware, inherited logic)", () => {
    const kong2bam = buildExposure(
      "kong",
      [
        n("bams", 2, "e0"),
        n("bams", 2, "e1"),
        n("bams", 2, "e2"),
        n("bams", 2, "e3"),
      ],
      n("bams", 2, "t"),
    )
    const rack = [n("bams", 8, "keep"), n("craks", 6, "toss")]
    const t = expertBot.chooseDiscard(ctx({ rack, exposures: [kong2bam] }))
    expect(t.id).toBe("toss")
  })

  it("prefers not to discard tiles matching opponents' exposures", () => {
    const opponentPung = buildExposure(
      "pung",
      [n("bams", 5, "e0"), n("bams", 5, "e1"), n("bams", 5, "e2")],
      n("bams", 5, "t"),
    )
    const allExposures = {
      east: [],
      south: [],
      west: [opponentPung],
      north: [],
    } as Record<Seat, Exposure[]>
    const rack = [n("bams", 5, "mine"), n("craks", 3, "safe")]
    const t = expertBot.chooseDiscard(ctx({ rack, allExposures }))
    expect(t.id).toBe("safe")
  })
})
