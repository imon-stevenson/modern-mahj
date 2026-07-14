import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
} from '../game/types';
import { SEATS } from '../game/types';
import { createRng } from '../game/rng';
import { dealFromWall, drawFromWall } from '../game/wall';
import { applyPass, nextPass } from '../game/charleston';
import { botFor } from '../game/bots';
import type { BotCtx } from '../game/bots';
import type { NMJLHand } from '../game/hands/schema';
import { allHands } from '../game/hands/loader';
import { matchAgainstAll } from '../game/hands/match';
import { buildExposure } from '../game/exposure';
import {
  nextSeat,
  possibleCallsForDiscard,
  removeTileById,
  resolveCallPriority,
  tilesForCall,
} from '../game/turn';
import { applyJokerSwap, validateJokerSwap } from '../game/jokerSwap';
import type { JokerSwapOffer } from '../game/jokerSwap';

// ---------- state shape ----------

type CharlestonState = {
  pass: CharlestonPass | null;
  selections: Record<Seat, string[]>;
  secondCharlestonAgreed: boolean | null;
  courtesyOffers: Record<Seat, number>;
};

type LastAction =
  | { kind: 'discard'; seat: Seat; tileId: string }
  | { kind: 'call'; seat: Seat; call: CallKind; tileId: string }
  | { kind: 'draw'; seat: Seat; tileId: string | null }
  | { kind: 'jokerSwap'; seat: Seat }
  | null;

export type MahjState = {
  difficulty: Difficulty;
  botDelayMs: number;
  callTimerMs: number;
  rngSeed: number;

  phase: GamePhase;
  wall: Tile[];
  players: Record<Seat, PlayerState>;
  discards: Tile[];
  currentSeat: Seat;
  awaitingCall: AwaitingCall;
  charleston: CharlestonState;
  winner: Seat | null;
  winningHand: NMJLHand | null;
  lastAction: LastAction;

  loadHandsSafe: () => NMJLHand[];

  newGame: (difficulty: Difficulty) => void;
  toggleTileSelection: (tileId: string) => void;
  clearSelection: (seat: Seat) => void;
  submitCharlestonSelection: (seat: Seat, tileIds: string[]) => void;
  runBotCharlestonForAll: () => void;
  advanceCharleston: () => void;
  agreeSecondCharleston: (agreed: boolean) => void;
  setCourtesyOffer: (seat: Seat, count: number) => void;
  finishSetup: () => void;

  humanDraw: () => void;
  humanDiscard: (tileId: string) => void;
  runBotTurn: (seat: Seat) => void;
  callWithHuman: (kind: CallKind) => void;
  passCall: () => void;
  offerJokerSwap: (offer: JokerSwapOffer) => void;
};

// ---------- helpers ----------

function emptyCharleston(): CharlestonState {
  return {
    pass: null,
    selections: { east: [], south: [], west: [], north: [] },
    secondCharlestonAgreed: null,
    courtesyOffers: { east: 0, south: 0, west: 0, north: 0 },
  };
}

function callTimerForDifficulty(d: Difficulty): number {
  return d === 'beginner' ? 0 : 5000;
}

function tileTotal(player: PlayerState): number {
  return player.rack.length + player.exposures.reduce((s, e) => s + e.tiles.length, 0);
}

function seatsExcept(seat: Seat): Seat[] {
  return SEATS.filter((s) => s !== seat);
}

function callableSeats(
  players: Record<Seat, PlayerState>,
  discarder: Seat,
  tile: Tile,
  hands: NMJLHand[],
): Seat[] {
  const out: Seat[] = [];
  for (const seat of seatsExcept(discarder)) {
    if (possibleCallsForDiscard(players[seat].rack, tile).length > 0) {
      out.push(seat);
      continue;
    }
    const trial = [...players[seat].rack, tile];
    if (matchAgainstAll(trial, players[seat].exposures, hands)) out.push(seat);
  }
  return out;
}

function safeHands(): NMJLHand[] {
  try {
    return allHands();
  } catch {
    return [];
  }
}

function buildBotCtx(state: MahjState, seat: Seat, rngOffset = 0): BotCtx {
  const allExposures: Record<Seat, Exposure[]> = Object.fromEntries(
    SEATS.map((s) => [s, state.players[s].exposures]),
  ) as Record<Seat, Exposure[]>;
  return {
    seat,
    rack: state.players[seat].rack,
    exposures: state.players[seat].exposures,
    allExposures,
    discardPile: state.discards,
    hands: state.loadHandsSafe(),
    rng: createRng(state.rngSeed + rngOffset + state.discards.length + seat.length),
  };
}

// Apply a claim (pung/kong/mahjong) as an atomic state mutation.
function applyCall(
  state: MahjState,
  caller: Seat,
  kind: CallKind,
  tile: Tile,
): Partial<MahjState> {
  if (kind === 'mahjong') {
    const trial = [...state.players[caller].rack, tile];
    const match = matchAgainstAll(trial, state.players[caller].exposures, safeHands());
    const nextPlayers: Record<Seat, PlayerState> = {
      ...state.players,
      [caller]: { ...state.players[caller], rack: trial },
    };
    return {
      players: nextPlayers,
      awaitingCall: null,
      phase: 'ended',
      winner: caller,
      winningHand: match?.hand ?? null,
      lastAction: { kind: 'call', seat: caller, call: kind, tileId: tile.id },
      discards: state.discards.filter((t) => t.id !== tile.id),
    };
  }
  const t = tilesForCall(kind, tile, state.players[caller].rack);
  const removeIds = new Set(t.fromRack.map((x) => x.id));
  const newRack = state.players[caller].rack.filter((x) => !removeIds.has(x.id));
  const exposure = buildExposure(kind, [tile, ...t.fromRack], tile);
  const nextPlayers: Record<Seat, PlayerState> = {
    ...state.players,
    [caller]: {
      ...state.players[caller],
      rack: newRack,
      exposures: [...state.players[caller].exposures, exposure],
    },
  };
  return {
    players: nextPlayers,
    awaitingCall: null,
    currentSeat: caller,
    lastAction: { kind: 'call', seat: caller, call: kind, tileId: tile.id },
    discards: state.discards.filter((t2) => t2.id !== tile.id),
  };
}

// Compute the winning bot call (if any) among the seats currently allowed to
// claim, and return an updated state slice reflecting either the winning call
// or turn advancement. Does NOT handle human input.
function resolveBotCalls(state: MahjState, discarder: Seat): Partial<MahjState> {
  if (!state.awaitingCall) return {};
  const bot = botFor(state.difficulty);
  const requests: { seat: Seat; kind: CallKind }[] = [];
  const tile = state.awaitingCall.discardTile;
  const hands = safeHands();
  for (const seat of state.awaitingCall.callableBy) {
    if (!state.players[seat].isBot) continue;
    const trial = [...state.players[seat].rack, tile];
    if (matchAgainstAll(trial, state.players[seat].exposures, hands)) {
      requests.push({ seat, kind: 'mahjong' });
      continue;
    }
    const available = possibleCallsForDiscard(state.players[seat].rack, tile);
    const decision = bot.decideCall(buildBotCtx(state, seat), tile, available);
    if (decision) requests.push({ seat, kind: decision });
  }
  const winner = resolveCallPriority(discarder, requests);
  if (!winner) {
    return { awaitingCall: null, currentSeat: nextSeat(discarder) };
  }
  return applyCall(state, winner.seat, winner.kind, tile);
}

// After a seat commits a discard, decide whether we need to wait on the
// human, resolve bot calls immediately, or just pass the turn.
function afterDiscard(
  state: MahjState,
  discarder: Seat,
): Partial<MahjState> {
  const tile = state.discards[state.discards.length - 1]!;
  const hands = safeHands();
  const callable = callableSeats(state.players, discarder, tile, hands);
  if (callable.length === 0) {
    return { awaitingCall: null, currentSeat: nextSeat(discarder) };
  }
  const humanCanCall = callable.includes('east');
  const awaiting: AwaitingCall = {
    discardId: tile.id,
    discardTile: tile,
    callableBy: callable,
    deadline: state.callTimerMs > 0 && humanCanCall ? Date.now() + state.callTimerMs : null,
  };
  const withAwaiting: MahjState = { ...state, awaitingCall: awaiting };
  if (!humanCanCall) {
    // No human input needed — decide bot calls now.
    return { awaitingCall: awaiting, ...resolveBotCalls(withAwaiting, discarder) };
  }
  return { awaitingCall: awaiting };
}

// ---------- store ----------

export const useMahjStore = create<MahjState>()(
  persist(
    (set, get) => ({
      difficulty: 'intermediate',
      botDelayMs: 800,
      callTimerMs: callTimerForDifficulty('intermediate'),
      rngSeed: 1,

      phase: 'setup',
      wall: [],
      players: {
        east: { seat: 'east', rack: [], exposures: [], isBot: false },
        south: { seat: 'south', rack: [], exposures: [], isBot: true },
        west: { seat: 'west', rack: [], exposures: [], isBot: true },
        north: { seat: 'north', rack: [], exposures: [], isBot: true },
      },
      discards: [],
      currentSeat: 'east',
      awaitingCall: null,
      charleston: emptyCharleston(),
      winner: null,
      winningHand: null,
      lastAction: null,

      loadHandsSafe: safeHands,

      newGame(difficulty) {
        const seed = Math.floor(Math.random() * 0x7fffffff);
        const rng = createRng(seed);
        const { wall, players } = dealFromWall(rng, (seat) => seat !== 'east');
        set({
          difficulty,
          callTimerMs: callTimerForDifficulty(difficulty),
          rngSeed: seed,
          phase: 'charleston',
          wall,
          players,
          discards: [],
          currentSeat: 'east',
          awaitingCall: null,
          charleston: { ...emptyCharleston(), pass: 'firstRight' },
          winner: null,
          winningHand: null,
          lastAction: null,
        });
      },

      toggleTileSelection(tileId) {
        const s = get();
        const cur = s.charleston.selections.east;
        const next = cur.includes(tileId)
          ? cur.filter((id) => id !== tileId)
          : [...cur, tileId];
        set({
          charleston: {
            ...s.charleston,
            selections: { ...s.charleston.selections, east: next },
          },
        });
      },

      clearSelection(seat) {
        const s = get();
        set({
          charleston: {
            ...s.charleston,
            selections: { ...s.charleston.selections, [seat]: [] },
          },
        });
      },

      submitCharlestonSelection(seat, tileIds) {
        const s = get();
        set({
          charleston: {
            ...s.charleston,
            selections: { ...s.charleston.selections, [seat]: tileIds },
          },
        });
      },

      runBotCharlestonForAll() {
        const s = get();
        if (!s.charleston.pass) return;
        const isCourtesy = s.charleston.pass === 'courtesy';
        const nextSelections = { ...s.charleston.selections };
        const bot = botFor(s.difficulty);
        for (const seat of SEATS) {
          if (!s.players[seat].isBot) continue;
          const ctx = buildBotCtx(s, seat);
          if (isCourtesy) {
            const count = s.charleston.courtesyOffers[seat];
            const picks = bot.chooseCourtesyPass(ctx, count);
            nextSelections[seat] = picks.slice(0, count).map((t) => t.id);
          } else {
            const picks = bot.chooseCharlestonPass(ctx);
            nextSelections[seat] = picks.map((t) => t.id);
          }
        }
        set({
          charleston: { ...s.charleston, selections: nextSelections },
        });
      },

      advanceCharleston() {
        const s = get();
        const pass = s.charleston.pass;
        if (!pass) return;

        const selectionTiles: Record<Seat, Tile[]> = Object.fromEntries(
          SEATS.map((seat) => {
            const ids = new Set(s.charleston.selections[seat]);
            return [seat, s.players[seat].rack.filter((t) => ids.has(t.id))];
          }),
        ) as Record<Seat, Tile[]>;

        let toApply = selectionTiles;
        if (pass === 'courtesy') {
          const eastWest = Math.min(
            s.charleston.courtesyOffers.east,
            s.charleston.courtesyOffers.west,
          );
          const southNorth = Math.min(
            s.charleston.courtesyOffers.south,
            s.charleston.courtesyOffers.north,
          );
          toApply = {
            east: selectionTiles.east.slice(0, eastWest),
            west: selectionTiles.west.slice(0, eastWest),
            south: selectionTiles.south.slice(0, southNorth),
            north: selectionTiles.north.slice(0, southNorth),
          };
        }

        const nextPlayers = applyPass(s.players, pass, toApply);
        const nextPassId = nextPass(pass);

        if (nextPassId === 'secondLeft') {
          const bots = SEATS.filter((seat) => nextPlayers[seat].isBot);
          const bot = botFor(s.difficulty);
          const votes = bots.map((seat) =>
            bot.wantsSecondCharleston(buildBotCtx({ ...s, players: nextPlayers }, seat)),
          );
          const allBotsAgree = votes.every((v) => v);
          set({
            players: nextPlayers,
            charleston: {
              ...emptyCharleston(),
              pass: null,
              secondCharlestonAgreed: allBotsAgree ? null : false,
            },
          });
          return;
        }

        set({
          players: nextPlayers,
          charleston: { ...emptyCharleston(), pass: nextPassId },
        });
        if (nextPassId === null) get().finishSetup();
      },

      agreeSecondCharleston(agreed) {
        if (!agreed) {
          set({
            charleston: {
              ...emptyCharleston(),
              pass: 'courtesy',
              secondCharlestonAgreed: false,
            },
          });
        } else {
          set({
            charleston: {
              ...emptyCharleston(),
              pass: 'secondLeft',
              secondCharlestonAgreed: true,
            },
          });
        }
      },

      setCourtesyOffer(seat, count) {
        const s = get();
        const clamped = Math.max(0, Math.min(3, count));
        set({
          charleston: {
            ...s.charleston,
            courtesyOffers: { ...s.charleston.courtesyOffers, [seat]: clamped },
          },
        });
      },

      finishSetup() {
        set({ phase: 'play', currentSeat: 'east' });
      },

      humanDraw() {
        const s = get();
        if (s.phase !== 'play' || s.currentSeat !== 'east') return;
        if (s.awaitingCall) return;
        // Only draw when holding 13 tiles; a call leaves East with 14 already.
        if (tileTotal(s.players.east) !== 13) return;
        const { tile, wall } = drawFromWall(s.wall);
        if (!tile) {
          set({ phase: 'ended', winner: null, winningHand: null });
          return;
        }
        const players: Record<Seat, PlayerState> = {
          ...s.players,
          east: { ...s.players.east, rack: [...s.players.east.rack, tile] },
        };
        set({ wall, players, lastAction: { kind: 'draw', seat: 'east', tileId: tile.id } });
        const s1 = get();
        const match = matchAgainstAll(
          s1.players.east.rack,
          s1.players.east.exposures,
          safeHands(),
        );
        if (match) set({ phase: 'ended', winner: 'east', winningHand: match.hand });
      },

      humanDiscard(tileId) {
        const s = get();
        if (s.phase !== 'play' || s.currentSeat !== 'east') return;
        const rack = s.players.east.rack;
        const tile = rack.find((t) => t.id === tileId);
        if (!tile) return;
        const players: Record<Seat, PlayerState> = {
          ...s.players,
          east: { ...s.players.east, rack: removeTileById(rack, tileId) },
        };
        const withDiscard: MahjState = {
          ...s,
          players,
          discards: [...s.discards, tile],
          lastAction: { kind: 'discard', seat: 'east', tileId },
        };
        set({ ...withDiscard, ...afterDiscard(withDiscard, 'east') });
      },

      passCall() {
        const s = get();
        if (!s.awaitingCall) return;
        const discarder =
          s.lastAction?.kind === 'discard' ? s.lastAction.seat : 'east';
        // Human passed — see if any bot still wants to call, then apply / pass.
        set(resolveBotCalls(s, discarder));
      },

      callWithHuman(kind) {
        const s = get();
        if (!s.awaitingCall) return;
        if (!s.awaitingCall.callableBy.includes('east')) return;
        set(applyCall(s, 'east', kind, s.awaitingCall.discardTile));
      },

      offerJokerSwap(offer) {
        const s = get();
        const v = validateJokerSwap(s.players, offer);
        if (!v.ok) return;
        set({
          players: applyJokerSwap(s.players, offer),
          lastAction: { kind: 'jokerSwap', seat: offer.offeringSeat },
        });
      },

      runBotTurn(seat) {
        const s0 = get();
        if (s0.phase !== 'play') return;
        if (s0.currentSeat !== seat) return;
        if (!s0.players[seat].isBot) return;
        if (s0.awaitingCall) return;

        const bot = botFor(s0.difficulty);

        // Optional joker swap before drawing.
        const swap = bot.wantsJokerSwap(buildBotCtx(s0, seat));
        if (swap) get().offerJokerSwap(swap);

        let s1 = get();

        // If the seat has 13 tiles total, they need to draw. If 14 (came from a
        // call), skip the draw and just discard.
        const total = tileTotal(s1.players[seat]);
        if (total === 13) {
          const { tile, wall } = drawFromWall(s1.wall);
          if (!tile) {
            set({ phase: 'ended', winner: null, winningHand: null });
            return;
          }
          const players: Record<Seat, PlayerState> = {
            ...s1.players,
            [seat]: { ...s1.players[seat], rack: [...s1.players[seat].rack, tile] },
          };
          set({
            wall,
            players,
            lastAction: { kind: 'draw', seat, tileId: tile.id },
          });
          s1 = get();
          // Self-Mahjong?
          const match = matchAgainstAll(
            s1.players[seat].rack,
            s1.players[seat].exposures,
            safeHands(),
          );
          if (match) {
            set({ phase: 'ended', winner: seat, winningHand: match.hand });
            return;
          }
        }

        // Choose discard.
        const ctx = buildBotCtx(get(), seat);
        const discard = bot.chooseDiscard(ctx);
        const s2 = get();
        const players2: Record<Seat, PlayerState> = {
          ...s2.players,
          [seat]: { ...s2.players[seat], rack: removeTileById(s2.players[seat].rack, discard.id) },
        };
        const withDiscard: MahjState = {
          ...s2,
          players: players2,
          discards: [...s2.discards, discard],
          lastAction: { kind: 'discard', seat, tileId: discard.id },
        };
        set({ ...withDiscard, ...afterDiscard(withDiscard, seat) });
      },
    }),
    {
      name: 'mahj-v1',
      version: 1,
      // Only persist data fields, not the action closures.
      partialize: (state) => ({
        difficulty: state.difficulty,
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
      }),
    },
  ),
);
