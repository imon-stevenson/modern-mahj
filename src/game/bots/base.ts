import type { CallKind, Exposure, Seat, Tile } from '../types';
import type { NMJLHand } from '../hands/schema';
import type { JokerSwapOffer } from '../jokerSwap';
import type { Rng } from '../rng';

export type BotCtx = {
  seat: Seat;
  rack: Tile[];
  exposures: Exposure[];
  // Exposures for every seat (including own) — used by expert-level defense
  // and by joker-swap decisions.
  allExposures: Record<Seat, Exposure[]>;
  discardPile: Tile[];
  hands: NMJLHand[];
  rng: Rng;
};

export interface BotStrategy {
  chooseCharlestonPass(ctx: BotCtx): [Tile, Tile, Tile];
  wantsSecondCharleston(ctx: BotCtx): boolean;
  chooseCourtesyPass(ctx: BotCtx, maxCount: number): Tile[];
  chooseDiscard(ctx: BotCtx): Tile;
  // Called after another player's discard. Return the highest-value call the
  // bot wishes to make, or null to pass.
  decideCall(ctx: BotCtx, discard: Tile, availableCalls: CallKind[]): CallKind | null;
  wantsJokerSwap(ctx: BotCtx): JokerSwapOffer | null;
}
