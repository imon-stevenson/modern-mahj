import type { CallKind, Tile } from '../types';
import type { JokerSwapOffer } from '../jokerSwap';
import type { BotCtx, BotStrategy } from './base';
import { matchAgainstAll } from '../hands/match';

function pickN<T>(items: readonly T[], n: number, rng: BotCtx['rng']): T[] {
  const copy = [...items];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = rng.nextInt(copy.length);
    out.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return out;
}

export const beginnerBot: BotStrategy = {
  chooseCharlestonPass(ctx) {
    const nonJokers = ctx.rack.filter((t) => t.kind !== 'joker');
    const picks = pickN(nonJokers, 3, ctx.rng);
    return picks as [Tile, Tile, Tile];
  },
  wantsSecondCharleston() {
    return false;
  },
  chooseCourtesyPass() {
    return [];
  },
  chooseDiscard(ctx) {
    const options = ctx.rack.filter((t) => t.kind !== 'joker');
    if (options.length === 0) return ctx.rack[0]!;
    return options[ctx.rng.nextInt(options.length)]!;
  },
  decideCall(ctx, discard, available): CallKind | null {
    // Only declare Mahjong, and only when a full match is possible right now
    // (including the discard as if it were in the rack).
    const trialRack = [...ctx.rack, discard];
    if (matchAgainstAll(trialRack, ctx.exposures, ctx.hands)) return 'mahjong';
    // Beginner never calls pung/kong.
    void available;
    return null;
  },
  wantsJokerSwap(): JokerSwapOffer | null {
    return null;
  },
};
