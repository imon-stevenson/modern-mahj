import { describe, expect, it } from "vitest"
import { useMahjStore } from "./index"
import { SEATS } from "../game/types"
import type { Seat } from "../game/types"
import { passTarget } from "../game/charleston"

// Every tile id currently held anywhere: the four racks plus East's face-down
// blind pool, which lives outside players.east.rack between an across pass and
// the blind pass that follows it.
function allHeldTileIds(): string[] {
  const state = useMahjStore.getState()
  const identifiers: string[] = []
  for (const seat of SEATS) {
    identifiers.push(...state.players[seat].rack.map((tile) => tile.id))
  }
  identifiers.push(...(state.charleston.blindPool ?? []).map((tile) => tile.id))
  return identifiers
}

// East's picks for a pass, taken straight off the top of the rack. The human's
// choice is irrelevant to these invariants—we only need a legal selection.
function eastSelection(count: number): string[] {
  return useMahjStore
    .getState()
    .players.east.rack.filter((tile) => tile.kind !== "joker")
    .slice(0, count)
    .map((tile) => tile.id)
}

// Drive one pass to completion, running the bots, and return every seat's
// selection so the caller can assert against it.
function playOnePass(): Record<Seat, string[]> {
  const state = useMahjStore.getState()
  state.submitCharlestonSelection("east", eastSelection(3))
  state.runBotCharlestonForAll()
  const selections = { ...useMahjStore.getState().charleston.selections }
  useMahjStore.getState().advanceCharleston()
  return selections
}

describe("charleston simulation", () => {
  it("conserves tiles and keeps racks disjoint", () => {
    for (let run = 0; run < 25; run++) {
      useMahjStore.getState().startGameWithCard(2025)
      const startingTileIds = allHeldTileIds().slice().sort()
      let guard = 0
      while (useMahjStore.getState().phase === "charleston" && guard++ < 40) {
        const state = useMahjStore.getState()
        const charleston = state.charleston
        if (charleston.pass === null) {
          state.agreeSecondCharleston(charleston.secondCharlestonAgreed === null)
          continue
        }
        if (charleston.pass === "courtesy") {
          const step = charleston.courtesyStep ?? "choose"
          if (step === "choose") {
            state.proposeCourtesyCount(3)
          } else if (step === "confirm") {
            state.confirmCourtesy(true)
          } else {
            const agreedCount =
              useMahjStore.getState().charleston.courtesyAgreedCount
            state.submitCharlestonSelection("east", eastSelection(agreedCount))
            state.advanceCharleston()
          }
          continue
        }
        if (
          (charleston.blindPool ?? []).length > 0 &&
          charleston.blindChoice == null
        ) {
          state.setBlindChoice(false)
          continue
        }
        playOnePass()

        const heldTileIds = allHeldTileIds()
        expect(
          new Set(heldTileIds).size,
          `run ${run}: the same tile id is held in two places`,
        ).toBe(heldTileIds.length)
      }

      const endingTileIds = allHeldTileIds().slice().sort()
      expect(endingTileIds, `run ${run}: tiles created or destroyed`).toEqual(
        startingTileIds,
      )
      const state = useMahjStore.getState()
      for (const seat of SEATS) {
        expect(
          state.players[seat].rack.length,
          `run ${run}: ${seat} rack size`,
        ).toBe(seat === "east" ? 14 : 13)
      }
    }
  })

  // The Charleston is simultaneous: you pick three tiles off your own rack
  // before you are allowed to look at what was passed to you. Nothing you
  // receive on a pass can go back out on that same pass.
  it("resolves each pass simultaneously—no seat forwards a tile it received in that same pass", () => {
    for (let run = 0; run < 25; run++) {
      useMahjStore.getState().startGameWithCard(2025)

      // firstRight, firstAcross, firstLeft—enough to cover a blind pass.
      for (let passIndex = 0; passIndex < 3; passIndex++) {
        const charleston = useMahjStore.getState().charleston
        const pass = charleston.pass
        if (!pass) break
        if ((charleston.blindPool ?? []).length > 0) {
          useMahjStore.getState().setBlindChoice(false)
        }

        const selections = playOnePass()

        for (const receiver of SEATS) {
          const sender = SEATS.find(
            (candidate) => passTarget(candidate, pass) === receiver,
          )
          if (!sender) continue
          const incoming = new Set(selections[sender])
          for (const outgoing of selections[receiver]) {
            expect(
              incoming.has(outgoing),
              `run ${run} ${pass}: ${receiver} passed tile ${outgoing} on the same pass it received it from ${sender}`,
            ).toBe(false)
          }
        }
      }
    }
  })
})
