import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  AwaitingCall,
  CallKind,
  CharlestonPass,
  Difficulty,
  Exposure,
  GamePhase,
  PlayerState,
  Seat,
  Tile,
} from "../game/types"
import { SEATS } from "../game/types"
import { createRng } from "../game/rng"
import { dealFromWall, drawFromWall } from "../game/wall"
import { applyPass, nextPass } from "../game/charleston"
import { botFor } from "../game/bots"
import type { BotCtx } from "../game/bots"
import type { NMJLHand } from "../game/hands/schema"
import { allHands } from "../game/hands/loader"
import type { CardYear } from "../game/hands/loader"
import { handsAllowGroupingForTile, matchAgainstAll } from "../game/hands/match"
import { buildExposure } from "../game/exposure"
import {
  nextSeat,
  possibleCallsForDiscard,
  removeTileById,
  resolveCallPriority,
  tilesForCall,
} from "../game/turn"
import { applyJokerSwap, validateJokerSwap } from "../game/jokerSwap"
import type { JokerSwapOffer } from "../game/jokerSwap"

// ---------- state shape ----------

type CharlestonState = {
  pass: CharlestonPass | null
  selections: Record<Seat, string[]>
  secondCharlestonAgreed: boolean | null
  courtesyOffers: Record<Seat, number>
  // Bots that declined the optional second Charleston via their strategy.
  // Populated when the second Charleston is skipped so the UI can explain why.
  secondDecliners: Seat[]
  // Courtesy pass negotiation (East ↔ West involves the human):
  //   'choose' —human proposes how many tiles (0–3) to exchange
  //   'confirm'—West offered fewer than the human wanted; confirm/decline
  //   'select' —human picks the agreed number of tiles to pass
  courtesyStep: "choose" | "confirm" | "select" | null
  // The finalized East↔West exchange count (min of both offers).
  courtesyAgreedCount: number
}

/**
 * True while the Charleston is waiting on a button decision rather than a tile
 * selection—the second-Charleston question, the bot-declined acknowledgement,
 * and the two courtesy negotiation steps. Rack taps are inert in these states.
 */
export function isCharlestonDecisionPrompt(c: CharlestonState): boolean {
  if (c.pass === null) return true
  if (c.pass !== "courtesy") return false
  // Matches CharlestonUI's `courtesyStep ?? 'choose'` default.
  return (c.courtesyStep ?? "choose") !== "select"
}

type LastAction =
  | { kind: "discard"; seat: Seat; tileId: string }
  | { kind: "call"; seat: Seat; call: CallKind; tileId: string }
  | { kind: "draw"; seat: Seat; tileId: string | null }
  | { kind: "jokerSwap"; seat: Seat }
  | null

export type MahjState = {
  difficulty: Difficulty
  // Which NMJL year card is in play. Chosen at new-game time; fixed for the game.
  cardYear: CardYear
  botDelayMs: number
  callTimerMs: number
  rngSeed: number

  phase: GamePhase
  wall: Tile[]
  players: Record<Seat, PlayerState>
  discards: Tile[]
  currentSeat: Seat
  awaitingCall: AwaitingCall
  charleston: CharlestonState
  winner: Seat | null
  winningHand: NMJLHand | null
  lastAction: LastAction
  // Manual left-to-right order for the human's (East) rack, as tile ids.
  // null means "use the default suit/number sort". Tiles not listed (e.g. a
  // freshly drawn tile) are appended after the listed ones.
  eastRackOrder: string[] | null
  // Card hands the human has clicked to highlight (as reference targets). Reset
  // at the start of every game.
  highlightedHands: string[]
  // When true, bot turns are halted and any running call timer is frozen so the
  // human can step away without missing a call. Not persisted.
  paused: boolean
  pausedCallRemainingMs: number | null

  loadHandsSafe: (year?: CardYear) => NMJLHand[]

  // Start a new game in two steps: open the on-mat picker (difficulty + card),
  // then deal with the chosen card.
  requestNewGame: () => void
  setDifficulty: (difficulty: Difficulty) => void
  setCardYear: (cardYear: CardYear) => void
  startGameWithCard: (cardYear: CardYear) => void
  reorderEastRack: (orderedIds: string[]) => void
  resetEastRackOrder: () => void
  toggleHandHighlight: (id: string) => void
  toggleTileSelection: (tileId: string) => void
  clearSelection: (seat: Seat) => void
  submitCharlestonSelection: (seat: Seat, tileIds: string[]) => void
  runBotCharlestonForAll: () => void
  advanceCharleston: () => void
  agreeSecondCharleston: (agreed: boolean) => void
  setCourtesyOffer: (seat: Seat, count: number) => void
  proposeCourtesyCount: (count: number) => void
  confirmCourtesy: (agree: boolean) => void
  finishSetup: () => void

  humanDraw: () => void
  humanDiscard: (tileId: string) => void
  runBotTurn: (seat: Seat) => void
  callWithHuman: (kind: CallKind) => void
  openHumanCall: () => void
  passCall: () => void
  offerJokerSwap: (offer: JokerSwapOffer) => void
  pauseGame: () => void
  resumeGame: () => void
}

// ---------- helpers ----------

function emptyCharleston(): CharlestonState {
  return {
    pass: null,
    selections: { east: [], south: [], west: [], north: [] },
    secondCharlestonAgreed: null,
    courtesyOffers: { east: 0, south: 0, west: 0, north: 0 },
    secondDecliners: [],
    courtesyStep: null,
    courtesyAgreedCount: 0,
  }
}

function callTimerForDifficulty(d: Difficulty): number {
  switch (d) {
    case "beginner":
      return 8000
    case "intermediate":
      return 6000
    case "expert":
      return 6000
  }
}

function tileTotal(player: PlayerState): number {
  return (
    player.rack.length +
    player.exposures.reduce((s, e) => s + e.tiles.length, 0)
  )
}

function seatsExcept(seat: Seat): Seat[] {
  return SEATS.filter((s) => s !== seat)
}

function callableSeats(
  players: Record<Seat, PlayerState>,
  discarder: Seat,
  tile: Tile,
  hands: NMJLHand[],
): Seat[] {
  const out: Seat[] = []
  for (const seat of seatsExcept(discarder)) {
    const rack = players[seat].rack
    const exposures = players[seat].exposures
    // A pung/kong only counts if some hand still reachable with this seat's
    // exposures actually uses that grouping of the tile—otherwise claiming it
    // would strand the hand (the bug where bots exposed unrelated pungs).
    const canGroup = possibleCallsForDiscard(rack, tile).some((k) =>
      handsAllowGroupingForTile(exposures, hands, tile, k),
    )
    if (canGroup) {
      out.push(seat)
      continue
    }
    const trial = [...rack, tile]
    if (matchAgainstAll(trial, exposures, hands)) out.push(seat)
  }
  return out
}

function safeHands(year: CardYear): NMJLHand[] {
  try {
    return allHands(year)
  } catch {
    return []
  }
}

function buildBotCtx(state: MahjState, seat: Seat, rngOffset = 0): BotCtx {
  const allExposures: Record<Seat, Exposure[]> = Object.fromEntries(
    SEATS.map((s) => [s, state.players[s].exposures]),
  ) as Record<Seat, Exposure[]>
  return {
    seat,
    rack: state.players[seat].rack,
    exposures: state.players[seat].exposures,
    allExposures,
    discardPile: state.discards,
    hands: state.loadHandsSafe(state.cardYear),
    rng: createRng(
      state.rngSeed + rngOffset + state.discards.length + seat.length,
    ),
  }
}

// Apply a claim (pung/kong/mahjong) as an atomic state mutation.
function applyCall(
  state: MahjState,
  caller: Seat,
  kind: CallKind,
  tile: Tile,
): Partial<MahjState> {
  if (kind === "mahjong") {
    const trial = [...state.players[caller].rack, tile]
    const match = matchAgainstAll(
      trial,
      state.players[caller].exposures,
      safeHands(state.cardYear),
    )
    const nextPlayers: Record<Seat, PlayerState> = {
      ...state.players,
      [caller]: { ...state.players[caller], rack: trial },
    }
    return {
      players: nextPlayers,
      awaitingCall: null,
      phase: "ended",
      winner: caller,
      winningHand: match?.hand ?? null,
      lastAction: { kind: "call", seat: caller, call: kind, tileId: tile.id },
      discards: state.discards.filter((t) => t.id !== tile.id),
    }
  }
  const t = tilesForCall(kind, tile, state.players[caller].rack)
  const removeIds = new Set(t.fromRack.map((x) => x.id))
  const newRack = state.players[caller].rack.filter((x) => !removeIds.has(x.id))
  const exposure = buildExposure(kind, [tile, ...t.fromRack], tile)
  const nextPlayers: Record<Seat, PlayerState> = {
    ...state.players,
    [caller]: {
      ...state.players[caller],
      rack: newRack,
      exposures: [...state.players[caller].exposures, exposure],
    },
  }
  return {
    players: nextPlayers,
    awaitingCall: null,
    currentSeat: caller,
    lastAction: { kind: "call", seat: caller, call: kind, tileId: tile.id },
    discards: state.discards.filter((t2) => t2.id !== tile.id),
  }
}

// Compute the winning bot call (if any) among the seats currently allowed to
// claim, and return an updated state slice reflecting either the winning call
// or turn advancement. Does NOT handle human input.
function resolveBotCalls(
  state: MahjState,
  discarder: Seat,
): Partial<MahjState> {
  if (!state.awaitingCall) return {}
  const bot = botFor(state.difficulty)
  const requests: { seat: Seat; kind: CallKind }[] = []
  const tile = state.awaitingCall.discardTile
  const hands = safeHands(state.cardYear)
  for (const seat of state.awaitingCall.callableBy) {
    if (!state.players[seat].isBot) continue
    const trial = [...state.players[seat].rack, tile]
    if (matchAgainstAll(trial, state.players[seat].exposures, hands)) {
      requests.push({ seat, kind: "mahjong" })
      continue
    }
    const available = possibleCallsForDiscard(state.players[seat].rack, tile)
    const decision = bot.decideCall(buildBotCtx(state, seat), tile, available)
    if (decision) requests.push({ seat, kind: decision })
  }
  const winner = resolveCallPriority(discarder, requests)
  if (!winner) {
    return { awaitingCall: null, currentSeat: nextSeat(discarder) }
  }
  return applyCall(state, winner.seat, winner.kind, tile)
}

// After a seat commits a discard, decide whether we need to wait on the
// human, resolve bot calls immediately, or just pass the turn.
function afterDiscard(state: MahjState, discarder: Seat): Partial<MahjState> {
  const tile = state.discards[state.discards.length - 1]!
  const hands = safeHands(state.cardYear)
  const callable = callableSeats(state.players, discarder, tile, hands)
  if (callable.length === 0) {
    return { awaitingCall: null, currentSeat: nextSeat(discarder) }
  }
  const humanCanCall = callable.includes("east")
  const awaiting: AwaitingCall = {
    discardId: tile.id,
    discardTile: tile,
    callableBy: callable,
    deadline:
      state.callTimerMs > 0 && humanCanCall
        ? Date.now() + state.callTimerMs
        : null,
    humanChoosing: false,
  }
  const withAwaiting: MahjState = { ...state, awaitingCall: awaiting }
  if (!humanCanCall) {
    // No human input needed—decide bot calls now.
    return {
      awaitingCall: awaiting,
      ...resolveBotCalls(withAwaiting, discarder),
    }
  }
  return { awaitingCall: awaiting }
}

// ---------- store ----------

export const useMahjStore = create<MahjState>()(
  persist(
    (set, get) => ({
      difficulty: "intermediate",
      // Doubles as the picker default: the most recently used card, or 2026.
      cardYear: 2026,
      botDelayMs: 800,
      callTimerMs: callTimerForDifficulty("intermediate"),
      rngSeed: 1,

      phase: "setup",
      wall: [],
      players: {
        east: { seat: "east", rack: [], exposures: [], isBot: false },
        south: { seat: "south", rack: [], exposures: [], isBot: true },
        west: { seat: "west", rack: [], exposures: [], isBot: true },
        north: { seat: "north", rack: [], exposures: [], isBot: true },
      },
      discards: [],
      currentSeat: "east",
      awaitingCall: null,
      charleston: emptyCharleston(),
      winner: null,
      winningHand: null,
      lastAction: null,
      eastRackOrder: null,
      highlightedHands: [],
      paused: false,
      pausedCallRemainingMs: null,

      loadHandsSafe: (year) => safeHands(year ?? get().cardYear),

      // Step 1: show the card + difficulty picker on the mat.
      requestNewGame() {
        set({ phase: "chooseCard" })
      },

      // Difficulty is chosen on the picker; keep the call timer in sync.
      setDifficulty(difficulty) {
        set({ difficulty, callTimerMs: callTimerForDifficulty(difficulty) })
      },

      // Select the card on the picker (persists as the default) without dealing.
      setCardYear(cardYear) {
        set({ cardYear })
      },

      // Step 2: deal the game with the chosen card (also becomes the next
      // picker default via `cardYear`).
      startGameWithCard(cardYear) {
        const seed = Math.floor(Math.random() * 0x7fffffff)
        const rng = createRng(seed)
        const { wall, players } = dealFromWall(rng, (seat) => seat !== "east")
        set({
          cardYear,
          rngSeed: seed,
          phase: "charleston",
          wall,
          players,
          discards: [],
          currentSeat: "east",
          awaitingCall: null,
          charleston: { ...emptyCharleston(), pass: "firstRight" },
          winner: null,
          winningHand: null,
          lastAction: null,
          eastRackOrder: null,
          highlightedHands: [],
          paused: false,
          pausedCallRemainingMs: null,
        })
      },

      reorderEastRack(orderedIds) {
        set({ eastRackOrder: [...orderedIds] })
      },

      resetEastRackOrder() {
        set({ eastRackOrder: null })
      },

      toggleHandHighlight(id) {
        const cur = get().highlightedHands
        set({
          highlightedHands: cur.includes(id)
            ? cur.filter((h) => h !== id)
            : [...cur, id],
        })
      },

      toggleTileSelection(tileId) {
        const s = get()
        const cur = s.charleston.selections.east
        const next = cur.includes(tileId)
          ? cur.filter((id) => id !== tileId)
          : [...cur, tileId]
        set({
          charleston: {
            ...s.charleston,
            selections: { ...s.charleston.selections, east: next },
          },
        })
      },

      clearSelection(seat) {
        const s = get()
        set({
          charleston: {
            ...s.charleston,
            selections: { ...s.charleston.selections, [seat]: [] },
          },
        })
      },

      submitCharlestonSelection(seat, tileIds) {
        const s = get()
        set({
          charleston: {
            ...s.charleston,
            selections: { ...s.charleston.selections, [seat]: tileIds },
          },
        })
      },

      runBotCharlestonForAll() {
        const s = get()
        if (!s.charleston.pass) return
        const isCourtesy = s.charleston.pass === "courtesy"
        const nextSelections = { ...s.charleston.selections }
        const nextOffers = { ...s.charleston.courtesyOffers }
        const bot = botFor(s.difficulty)
        for (const seat of SEATS) {
          if (!s.players[seat].isBot) continue
          const ctx = buildBotCtx(s, seat)
          if (isCourtesy) {
            // Each bot decides how many tiles (0–3) it will offer. The pair's
            // actual count is the min of the two offers (see advanceCharleston),
            // so we must record the bot's own offer—not leave it at 0.
            const count = bot.chooseCourtesyCount(ctx)
            const picks = bot.chooseCourtesyPass(ctx, count)
            nextSelections[seat] = picks.map((t) => t.id)
            nextOffers[seat] = picks.length
          } else {
            const picks = bot.chooseCharlestonPass(ctx)
            nextSelections[seat] = picks.map((t) => t.id)
          }
        }
        set({
          charleston: {
            ...s.charleston,
            selections: nextSelections,
            courtesyOffers: nextOffers,
          },
        })
      },

      advanceCharleston() {
        const s = get()
        const pass = s.charleston.pass
        if (!pass) return

        const selectionTiles: Record<Seat, Tile[]> = Object.fromEntries(
          SEATS.map((seat) => {
            const ids = new Set(s.charleston.selections[seat])
            return [seat, s.players[seat].rack.filter((t) => ids.has(t.id))]
          }),
        ) as Record<Seat, Tile[]>

        let toApply = selectionTiles
        if (pass === "courtesy") {
          const eastWest = Math.min(
            s.charleston.courtesyOffers.east,
            s.charleston.courtesyOffers.west,
          )
          const southNorth = Math.min(
            s.charleston.courtesyOffers.south,
            s.charleston.courtesyOffers.north,
          )
          toApply = {
            east: selectionTiles.east.slice(0, eastWest),
            west: selectionTiles.west.slice(0, eastWest),
            south: selectionTiles.south.slice(0, southNorth),
            north: selectionTiles.north.slice(0, southNorth),
          }
        }

        const nextPlayers = applyPass(s.players, pass, toApply)
        const nextPassId = nextPass(pass)

        if (nextPassId === "secondLeft") {
          const bots = SEATS.filter((seat) => nextPlayers[seat].isBot)
          const bot = botFor(s.difficulty)
          // A second Charleston needs unanimous consent—record any bot that
          // declines so the human is told who (and that it's being skipped).
          const decliners = bots.filter(
            (seat) =>
              !bot.wantsSecondCharleston(
                buildBotCtx({ ...s, players: nextPlayers }, seat),
              ),
          )
          set({
            players: nextPlayers,
            charleston: {
              ...emptyCharleston(),
              pass: null,
              secondCharlestonAgreed: decliners.length === 0 ? null : false,
              secondDecliners: decliners,
            },
          })
          return
        }

        set({
          players: nextPlayers,
          charleston: {
            ...emptyCharleston(),
            pass: nextPassId,
            courtesyStep: nextPassId === "courtesy" ? "choose" : null,
          },
        })
        if (nextPassId === null) get().finishSetup()
      },

      agreeSecondCharleston(agreed) {
        if (!agreed) {
          set({
            charleston: {
              ...emptyCharleston(),
              pass: "courtesy",
              secondCharlestonAgreed: false,
              courtesyStep: "choose",
            },
          })
        } else {
          set({
            charleston: {
              ...emptyCharleston(),
              pass: "secondLeft",
              secondCharlestonAgreed: true,
            },
          })
        }
      },

      setCourtesyOffer(seat, count) {
        const s = get()
        const clamped = Math.max(0, Math.min(3, count))
        set({
          charleston: {
            ...s.charleston,
            courtesyOffers: { ...s.charleston.courtesyOffers, [seat]: clamped },
          },
        })
      },

      proposeCourtesyCount(count) {
        const s0 = get()
        if (s0.charleston.pass !== "courtesy") return
        const clamped = Math.max(0, Math.min(3, count))
        // Record the human's offer, then let every bot choose its own offer.
        set({
          charleston: {
            ...s0.charleston,
            courtesyOffers: { ...s0.charleston.courtesyOffers, east: clamped },
          },
        })
        get().runBotCharlestonForAll()
        const s = get()
        const westOffer = s.charleston.courtesyOffers.west
        const agreed = Math.min(clamped, westOffer)
        if (clamped === 0) {
          // Human opts out entirely—East passes nothing; finish the courtesy.
          set({
            charleston: {
              ...s.charleston,
              courtesyStep: null,
              selections: { ...s.charleston.selections, east: [] },
            },
          })
          get().advanceCharleston()
          return
        }
        if (westOffer < clamped) {
          // West can't match the human's offer—ask them to confirm/decline.
          set({
            charleston: {
              ...s.charleston,
              courtesyStep: "confirm",
              courtesyAgreedCount: agreed,
            },
          })
        } else {
          set({
            charleston: {
              ...s.charleston,
              courtesyStep: "select",
              courtesyAgreedCount: agreed,
              selections: { ...s.charleston.selections, east: [] },
            },
          })
        }
      },

      confirmCourtesy(agree) {
        const s = get()
        if (s.charleston.pass !== "courtesy") return
        if (agree && s.charleston.courtesyAgreedCount > 0) {
          set({
            charleston: {
              ...s.charleston,
              courtesyStep: "select",
              selections: { ...s.charleston.selections, east: [] },
            },
          })
          return
        }
        // Declined (or nothing to exchange)—East passes no tiles, then finish.
        set({
          charleston: {
            ...s.charleston,
            courtesyStep: null,
            courtesyOffers: { ...s.charleston.courtesyOffers, east: 0 },
            selections: { ...s.charleston.selections, east: [] },
          },
        })
        get().advanceCharleston()
      },

      finishSetup() {
        set({ phase: "play", currentSeat: "east" })
      },

      humanDraw() {
        const s = get()
        if (s.phase !== "play" || s.currentSeat !== "east") return
        if (s.awaitingCall) return
        // Only draw when holding 13 tiles; a call leaves East with 14 already.
        if (tileTotal(s.players.east) !== 13) return
        const { tile, wall } = drawFromWall(s.wall)
        if (!tile) {
          set({ phase: "ended", winner: null, winningHand: null })
          return
        }
        const players: Record<Seat, PlayerState> = {
          ...s.players,
          east: { ...s.players.east, rack: [...s.players.east.rack, tile] },
        }
        set({
          wall,
          players,
          lastAction: { kind: "draw", seat: "east", tileId: tile.id },
        })
        const s1 = get()
        const match = matchAgainstAll(
          s1.players.east.rack,
          s1.players.east.exposures,
          safeHands(s1.cardYear),
        )
        if (match)
          set({ phase: "ended", winner: "east", winningHand: match.hand })
      },

      humanDiscard(tileId) {
        const s = get()
        if (s.phase !== "play" || s.currentSeat !== "east") return
        const rack = s.players.east.rack
        const tile = rack.find((t) => t.id === tileId)
        if (!tile) return
        const players: Record<Seat, PlayerState> = {
          ...s.players,
          east: { ...s.players.east, rack: removeTileById(rack, tileId) },
        }
        const withDiscard: MahjState = {
          ...s,
          players,
          discards: [...s.discards, tile],
          lastAction: { kind: "discard", seat: "east", tileId },
        }
        set({ ...withDiscard, ...afterDiscard(withDiscard, "east") })
      },

      passCall() {
        const s = get()
        if (!s.awaitingCall) return
        const discarder =
          s.lastAction?.kind === "discard" ? s.lastAction.seat : "east"
        // Human passed—see if any bot still wants to call, then apply / pass.
        set(resolveBotCalls(s, discarder))
      },

      callWithHuman(kind) {
        const s = get()
        if (!s.awaitingCall) return
        if (!s.awaitingCall.callableBy.includes("east")) return
        set(applyCall(s, "east", kind, s.awaitingCall.discardTile))
      },

      openHumanCall() {
        const s = get()
        if (!s.awaitingCall) return
        if (!s.awaitingCall.callableBy.includes("east")) return
        // Human committed to deciding—pause the countdown (unlimited) and let
        // the UI show the specific claim options.
        set({
          awaitingCall: {
            ...s.awaitingCall,
            humanChoosing: true,
            deadline: null,
          },
        })
      },

      offerJokerSwap(offer) {
        const s = get()
        const v = validateJokerSwap(s.players, offer)
        if (!v.ok) return
        set({
          players: applyJokerSwap(s.players, offer),
          lastAction: { kind: "jokerSwap", seat: offer.offeringSeat },
        })
      },

      pauseGame() {
        const s = get()
        if (s.paused) return
        // Freeze a running call countdown by stashing the remaining time and
        // nulling the deadline (same trick as openHumanCall); restored on resume.
        let awaitingCall = s.awaitingCall
        let pausedCallRemainingMs: number | null = null
        if (awaitingCall?.deadline) {
          pausedCallRemainingMs = Math.max(
            0,
            awaitingCall.deadline - Date.now(),
          )
          awaitingCall = { ...awaitingCall, deadline: null }
        }
        set({ paused: true, awaitingCall, pausedCallRemainingMs })
      },

      resumeGame() {
        const s = get()
        if (!s.paused) return
        let awaitingCall = s.awaitingCall
        if (
          awaitingCall &&
          !awaitingCall.humanChoosing &&
          s.pausedCallRemainingMs != null
        ) {
          awaitingCall = {
            ...awaitingCall,
            deadline: Date.now() + s.pausedCallRemainingMs,
          }
        }
        set({ paused: false, awaitingCall, pausedCallRemainingMs: null })
      },

      runBotTurn(seat) {
        const s0 = get()
        if (s0.phase !== "play") return
        if (s0.currentSeat !== seat) return
        if (!s0.players[seat].isBot) return
        if (s0.awaitingCall) return

        const bot = botFor(s0.difficulty)

        // Optional joker swap before drawing.
        const swap = bot.wantsJokerSwap(buildBotCtx(s0, seat))
        if (swap) get().offerJokerSwap(swap)

        const s1 = get()

        // If the seat has 13 tiles total, they need to draw. If 14 (came from a
        // call), skip the draw and just discard.
        const total = tileTotal(s1.players[seat])
        if (total === 13) {
          const { tile, wall } = drawFromWall(s1.wall)
          if (!tile) {
            set({ phase: "ended", winner: null, winningHand: null })
            return
          }
          const players: Record<Seat, PlayerState> = {
            ...s1.players,
            [seat]: {
              ...s1.players[seat],
              rack: [...s1.players[seat].rack, tile],
            },
          }
          set({
            wall,
            players,
            lastAction: { kind: "draw", seat, tileId: tile.id },
          })
        }

        // Win check—runs whether the bot just drew or arrived with 14 tiles
        // from a claim. Catches a self-drawn Mahjong AND any hand that became
        // complete via an earlier call, so a bot win always ends the game
        // (shows the banner) instead of falling through to an impossible
        // discard and hanging on an infinite "thinking" loop.
        const winState = get()
        const winner = matchAgainstAll(
          winState.players[seat].rack,
          winState.players[seat].exposures,
          safeHands(winState.cardYear),
        )
        if (winner) {
          set({ phase: "ended", winner: seat, winningHand: winner.hand })
          return
        }

        // Choose discard.
        const ctx = buildBotCtx(get(), seat)
        const discard = bot.chooseDiscard(ctx)
        // Defensive: a bot with no tile to discard means an already-complete or
        // corrupted hand; bail rather than throw on `discard.id`.
        if (!discard) return
        const s2 = get()
        const players2: Record<Seat, PlayerState> = {
          ...s2.players,
          [seat]: {
            ...s2.players[seat],
            rack: removeTileById(s2.players[seat].rack, discard.id),
          },
        }
        const withDiscard: MahjState = {
          ...s2,
          players: players2,
          discards: [...s2.discards, discard],
          lastAction: { kind: "discard", seat, tileId: discard.id },
        }
        set({ ...withDiscard, ...afterDiscard(withDiscard, seat) })
      },
    }),
    {
      name: "mahj",
      // Bump `version` whenever bot/hand/turn logic changes so a game dealt by an
      // older build can't resurface with now-invalid state (e.g. bot exposures
      // that predate the exposure-aware call gate). `migrate` keeps user prefs
      // but drops the in-progress game, so old saves reload at phase "setup".
      version: 2,
      migrate: (persisted, fromVersion) => {
        const p = (persisted ?? {}) as Partial<MahjState>
        if (fromVersion >= 2) return p as unknown as MahjState
        // Older save: keep only the (defined) preferences and drop the
        // in-progress game, so it reloads at phase "setup". Undefined keys are
        // omitted so they don't overwrite the initial-state defaults on merge.
        const prefs: Partial<MahjState> = {}
        if (p.difficulty !== undefined) prefs.difficulty = p.difficulty
        if (p.cardYear !== undefined) prefs.cardYear = p.cardYear
        if (p.botDelayMs !== undefined) prefs.botDelayMs = p.botDelayMs
        if (p.callTimerMs !== undefined) prefs.callTimerMs = p.callTimerMs
        if (p.rngSeed !== undefined) prefs.rngSeed = p.rngSeed
        return prefs as unknown as MahjState
      },
      // Only persist data fields, not the action closures.
      partialize: (state) => ({
        difficulty: state.difficulty,
        cardYear: state.cardYear,
        botDelayMs: state.botDelayMs,
        callTimerMs: state.callTimerMs,
        rngSeed: state.rngSeed,
        phase: state.phase,
        wall: state.wall,
        players: state.players,
        discards: state.discards,
        currentSeat: state.currentSeat,
        awaitingCall: state.awaitingCall,
        charleston: state.charleston,
        winner: state.winner,
        winningHand: state.winningHand,
        lastAction: state.lastAction,
        eastRackOrder: state.eastRackOrder,
        highlightedHands: state.highlightedHands,
      }),
    },
  ),
)
