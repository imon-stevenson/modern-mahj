import { describe, expect, it } from "vitest"
import {
  handTileColors,
  parseHandPattern,
  patternColorRuns,
} from "./cardPattern"
import { allHands } from "../game/hands/loader"
import type { CardYear } from "../game/hands/loader"

const GREEN = "var(--suit-green)"
const RED = "var(--suit-red)"
const NAVY = "var(--tile-navy)"

const hand = (id: string) => {
  const h = allHands(2026).find((x) => x.id === id)
  if (!h) throw new Error(`hand ${id} not found`)
  return h
}

describe("parseHandPattern", () => {
  it("splits the tile pattern from its note and drops the explanation", () => {
    const { pattern, note } = parseHandPattern(hand("2468-2").description)
    expect(pattern).toBe("FF 2222 44 66 8888")
    expect(note).toBe("(Any 2 Suits)")
  })

  it("handles a description with no parenthetical note", () => {
    // winds-dragons-1a: "NNNN EEE WWW SSSS — variant A: …"
    const { pattern, note } = parseHandPattern(hand("winds-dragons-1a").description)
    expect(pattern).toBe("NNNN EEE WWW SSSS")
    expect(note).toBe("")
  })
})

describe("handTileColors", () => {
  it("colors FF 2222 44 66 8888 by suit (flowers navy, X green, Y red)", () => {
    // FF(navy×2) 2222(X→green×4) 44(Y→red×2) 66(Y→red×2) 8888(X→green×4)
    expect(handTileColors(hand("2468-2").groups)).toEqual([
      NAVY, NAVY,
      GREEN, GREEN, GREEN, GREEN,
      RED, RED,
      RED, RED,
      GREEN, GREEN, GREEN, GREEN,
    ])
  })

  it("colors soap (0) navy while its year-digit neighbors follow the suit var", () => {
    // singles-pairs-6: FF 2026 2026 2026 — each 2026 = 2(X) 0(soap→navy) 2(X) 6(X)
    const colors = handTileColors(hand("singles-pairs-6").groups)
    // FF
    expect(colors.slice(0, 2)).toEqual([NAVY, NAVY])
    // first 2026 group (X=green digits, soap navy)
    expect(colors.slice(2, 6)).toEqual([GREEN, NAVY, GREEN, GREEN])
    // second 2026 group (Y=red digits, soap navy)
    expect(colors.slice(6, 10)).toEqual([RED, NAVY, RED, RED])
    // third 2026 group (Z=navy digits, soap navy) — all navy
    expect(colors.slice(10, 14)).toEqual([NAVY, NAVY, NAVY, NAVY])
  })

  it("produces exactly 14 colors for every hand, aligned to pattern chars", () => {
    for (const year of [2025, 2026] as CardYear[]) {
      for (const h of allHands(year)) {
        const colors = handTileColors(h.groups)
        expect(colors).toHaveLength(14)
        const { pattern } = parseHandPattern(h.description)
        // Tile characters only — "+"/"=" are navy separators, not tiles.
        expect(pattern.replace(/[\s+=]/g, "").length).toBe(14)
      }
    }
  })
})

const hand2025 = (id: string) => {
  const h = allHands(2025).find((x) => x.id === id)
  if (!h) throw new Error(`hand ${id} not found`)
  return h
}

describe("2025 card normalization", () => {
  it("2025-1b shows pungs of 5s (not the 2s template)", () => {
    expect(parseHandPattern(hand2025("2025-1b").description).pattern).toBe(
      "FFFF 2025 555 555",
    )
  })

  it("consec-2a is a valid 14-tile single variant", () => {
    const { pattern } = parseHandPattern(hand2025("consec-2a").description)
    expect(pattern).toBe("1111 2222 333 444")
    expect(handTileColors(hand2025("consec-2a").groups)).toHaveLength(14)
  })

  it("patternColorRuns treats + and = as navy and colors 13579-4 correctly", () => {
    const h = hand2025("13579-4")
    const { pattern } = parseHandPattern(h.description)
    expect(pattern).toBe("FFFF 1111 + 9999 = 10")
    const runs = patternColorRuns(pattern, handTileColors(h.groups))
    expect(runs).toEqual([
      { text: "FFFF", color: NAVY },
      { text: " ", color: null },
      { text: "1111", color: GREEN },
      { text: " ", color: null },
      { text: "+", color: NAVY },
      { text: " ", color: null },
      { text: "9999", color: RED },
      { text: " ", color: null },
      { text: "=", color: NAVY },
      { text: " ", color: null },
      { text: "10", color: NAVY },
    ])
  })
})
