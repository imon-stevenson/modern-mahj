import { describe, expect, it } from "vitest"
import { useMahjStore } from "./index"
import type { Tile, Wind } from "../game/types"

let counter = 0
const w = (wind: Wind): Tile => ({ id: `w${counter++}`, kind: "wind", wind })

describe("runBotTurn—a bot win ends the game", () => {
  it("sets phase ended + winner when a bot arrives with a completed hand", () => {
    // Winds-Dragons-1a on the 2026 card: NNNN EEE WWW SSSS—14 tiles, no
    // suit/number variables, so this rack is an unambiguous winning hand.
    const rack: Tile[] = [
      w("N"),
      w("N"),
      w("N"),
      w("N"),
      w("E"),
      w("E"),
      w("E"),
      w("W"),
      w("W"),
      w("W"),
      w("S"),
      w("S"),
      w("S"),
      w("S"),
    ]
    const base = useMahjStore.getState()
    useMahjStore.setState({
      phase: "play",
      currentSeat: "north",
      cardYear: 2026,
      awaitingCall: null,
      paused: false,
      players: {
        ...base.players,
        north: { seat: "north", rack, exposures: [], isBot: true },
      },
    })

    // Before the fix this fell through to an impossible discard (leaving the
    // game in "play" and, with an empty rack, throwing on `discard.id`).
    useMahjStore.getState().runBotTurn("north")

    const after = useMahjStore.getState()
    expect(after.phase).toBe("ended")
    expect(after.winner).toBe("north")
    expect(after.winningHand?.id).toBe("winds-dragons-1a")
  })
})

describe("Charleston blind pass", () => {
  // Racks of distinct, seat-labelled tiles so we can trace where each one goes.
  const seatRack = (seat: string, n: number): Tile[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `${seat}-${i}`,
      kind: "number" as const,
      suit: "bams" as const,
      rank: ((i % 9) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
    }))

  function seatPlayers() {
    return {
      east: {
        seat: "east" as const,
        rack: seatRack("east", 14),
        exposures: [],
        isBot: false,
      },
      south: {
        seat: "south" as const,
        rack: seatRack("south", 13),
        exposures: [],
        isBot: true,
      },
      west: {
        seat: "west" as const,
        rack: seatRack("west", 13),
        exposures: [],
        isBot: true,
      },
      north: {
        seat: "north" as const,
        rack: seatRack("north", 13),
        exposures: [],
        isBot: true,
      },
    }
  }

  // Put the store mid-Charleston on `pass` with every seat's selection made.
  function armPass(pass: "firstRight" | "firstAcross" | "firstLeft") {
    const players = seatPlayers()
    const base = useMahjStore.getState()
    useMahjStore.setState({
      phase: "charleston",
      players,
      charleston: {
        ...base.charleston,
        pass,
        blindPool: [],
        selections: {
          east: players.east.rack.slice(0, 3).map((t) => t.id),
          south: players.south.rack.slice(0, 3).map((t) => t.id),
          west: players.west.rack.slice(0, 3).map((t) => t.id),
          north: players.north.rack.slice(0, 3).map((t) => t.id),
        },
      },
    })
    return players
  }

  it("holds East's three across-pass tiles face-down for the blind pass", () => {
    const players = armPass("firstAcross")
    // West passes across to East.
    const incoming = players.west.rack.slice(0, 3).map((t) => t.id)

    useMahjStore.getState().advanceCharleston()

    const after = useMahjStore.getState()
    expect(after.charleston.pass).toBe("firstLeft")
    expect(after.charleston.blindPool.map((t) => t.id)).toEqual(incoming)
    // 14 - 3 passed = 11 in the rack; the 3 received are held out of it.
    expect(after.players.east.rack).toHaveLength(11)
    for (const id of incoming) {
      expect(after.players.east.rack.find((t) => t.id === id)).toBeUndefined()
    }
  })

  it("forwards chosen face-down tiles and reveals the rest", () => {
    armPass("firstAcross")
    useMahjStore.getState().advanceCharleston()

    const mid = useMahjStore.getState()
    const pool = mid.charleston.blindPool
    const blindPicks = pool.slice(0, 2).map((t) => t.id)
    const keptBlind = pool[2]!.id
    const rackPick = mid.players.east.rack[0]!.id

    useMahjStore.setState({
      charleston: {
        ...mid.charleston,
        selections: {
          ...mid.charleston.selections,
          east: [...blindPicks, rackPick],
          south: mid.players.south.rack.slice(0, 3).map((t) => t.id),
          west: mid.players.west.rack.slice(0, 3).map((t) => t.id),
          north: mid.players.north.rack.slice(0, 3).map((t) => t.id),
        },
      },
    })
    useMahjStore.getState().advanceCharleston()

    const after = useMahjStore.getState()
    // firstLeft: East passes to South.
    for (const id of [...blindPicks, rackPick]) {
      expect(after.players.south.rack.find((t) => t.id === id)).toBeDefined()
      expect(after.players.east.rack.find((t) => t.id === id)).toBeUndefined()
    }
    // The unchosen face-down tile joins the rack, face-up.
    expect(after.players.east.rack.find((t) => t.id === keptBlind)).toBeDefined()
    expect(after.charleston.blindPool).toEqual([])
  })

  it("marks the tiles the blind pass left behind so they aren't re-highlighted", () => {
    armPass("firstAcross")
    useMahjStore.getState().advanceCharleston()

    const mid = useMahjStore.getState()
    const pool = mid.charleston.blindPool
    const blindPick = pool[0]!.id
    const leftBehind = pool.slice(1).map((t) => t.id)

    useMahjStore.setState({
      charleston: {
        ...mid.charleston,
        selections: {
          ...mid.charleston.selections,
          east: [blindPick, ...mid.players.east.rack.slice(0, 2).map((t) => t.id)],
          south: mid.players.south.rack.slice(0, 3).map((t) => t.id),
          west: mid.players.west.rack.slice(0, 3).map((t) => t.id),
          north: mid.players.north.rack.slice(0, 3).map((t) => t.id),
        },
      },
    })
    // firstLeft advances to secondLeft, which takes the early-return branch.
    useMahjStore.getState().advanceCharleston()

    const after = useMahjStore.getState()
    expect(after.charleston.blindRevealed).toEqual(leftBehind)
  })

  it("records nothing revealed when the blind pass is declined", () => {
    armPass("firstAcross")
    useMahjStore.getState().advanceCharleston()
    useMahjStore.getState().setBlindChoice(false)

    expect(useMahjStore.getState().charleston.blindRevealed).toEqual([])
  })

  it("reveals the pool into the rack when the blind pass is declined", () => {
    armPass("firstAcross")
    useMahjStore.getState().advanceCharleston()

    const pooled = useMahjStore
      .getState()
      .charleston.blindPool.map((t) => t.id)
    expect(pooled).toHaveLength(3)

    useMahjStore.getState().setBlindChoice(false)

    const after = useMahjStore.getState()
    expect(after.charleston.blindChoice).toBe(false)
    expect(after.charleston.blindPool).toEqual([])
    // 11 kept + the 3 picked up = the full 14 again.
    expect(after.players.east.rack).toHaveLength(14)
    for (const id of pooled) {
      expect(after.players.east.rack.find((t) => t.id === id)).toBeDefined()
    }
  })

  it("keeps the pool face-down when the blind pass is accepted", () => {
    armPass("firstAcross")
    useMahjStore.getState().advanceCharleston()
    useMahjStore.getState().setBlindChoice(true)

    const after = useMahjStore.getState()
    expect(after.charleston.blindChoice).toBe(true)
    expect(after.charleston.blindPool).toHaveLength(3)
    expect(after.players.east.rack).toHaveLength(11)
  })

  it("holds nothing back after a pass that isn't followed by a blind pass", () => {
    armPass("firstRight")
    useMahjStore.getState().advanceCharleston()

    const after = useMahjStore.getState()
    expect(after.charleston.pass).toBe("firstAcross")
    expect(after.charleston.blindPool).toEqual([])
    expect(after.players.east.rack).toHaveLength(14)
  })
})

describe("card hand highlighting", () => {
  it("toggles a hand id on and off", () => {
    useMahjStore.setState({ highlightedHands: [] })
    const { toggleHandHighlight } = useMahjStore.getState()
    toggleHandHighlight("2026-1")
    expect(useMahjStore.getState().highlightedHands).toEqual(["2026-1"])
    toggleHandHighlight("2026-1")
    expect(useMahjStore.getState().highlightedHands).toEqual([])
  })

  it("clears highlights when a new game is dealt", () => {
    useMahjStore.setState({ highlightedHands: ["2026-1", "2468-3"] })
    useMahjStore.getState().startGameWithCard(2026)
    expect(useMahjStore.getState().highlightedHands).toEqual([])
  })
})
