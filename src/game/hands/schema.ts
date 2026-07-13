import { z } from 'zod';
import type { DragonColor, Suit, Wind } from '../types';

// Suits and numbers can be VARIABLES on a hand entry. At match time we bind
// each variable to a concrete value and check whether the player's tiles fit.
// Suit vars are letters X/Y/Z; number vars are N and its offsets.

export const SuitVar = z.enum(['X', 'Y', 'Z']);
export type SuitVar = z.infer<typeof SuitVar>;

export const NumberVar = z.enum(['N', 'N+1', 'N+2', 'N+3', 'N+4']);
export type NumberVar = z.infer<typeof NumberVar>;

const Suit_z = z.enum(['bams', 'craks', 'dots']) satisfies z.ZodType<Suit>;
const Wind_z = z.enum(['N', 'E', 'S', 'W']) satisfies z.ZodType<Wind>;
const Dragon_z = z.enum(['red', 'green', 'white']) satisfies z.ZodType<DragonColor>;

// A TilePattern describes what a single tile slot must look like. Rank 0 by
// convention represents the White Dragon (soap) when used as a "zero" digit.
export const TilePattern = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('number'),
    rank: z.number().int().min(0).max(9),
    suitVar: SuitVar,
  }),
  z.object({
    kind: z.literal('number'),
    numVar: NumberVar,
    suitVar: SuitVar,
  }),
  z.object({ kind: z.literal('wind'), wind: Wind_z }),
  z.object({ kind: z.literal('dragon'), color: Dragon_z }),
  z.object({ kind: z.literal('dragon'), suitVar: SuitVar }),
  z.object({ kind: z.literal('flower') }),
  // Fixed suit variant (e.g. "5 in bams specifically") — rarely needed but
  // handy for hands like NEWS or specific-suit hands.
  z.object({
    kind: z.literal('number'),
    rank: z.number().int().min(0).max(9),
    suit: Suit_z,
  }),
]);
export type TilePattern = z.infer<typeof TilePattern>;

export const GroupKind = z.enum(['single', 'pair', 'pung', 'kong', 'quint', 'sextet']);
export type GroupKind = z.infer<typeof GroupKind>;

export const GroupPattern = z.object({
  kind: GroupKind,
  tile: TilePattern,
  jokersAllowed: z.boolean(),
});
export type GroupPattern = z.infer<typeof GroupPattern>;

export const SuitConstraint = z.discriminatedUnion('rule', [
  z.object({ rule: z.literal('allDifferent'), vars: z.array(SuitVar).min(2) }),
  z.object({ rule: z.literal('same'), vars: z.array(SuitVar).min(2) }),
]);
export type SuitConstraint = z.infer<typeof SuitConstraint>;

export const NumberConstraint = z.discriminatedUnion('rule', [
  z.object({
    rule: z.literal('range'),
    var: NumberVar,
    min: z.number().int().min(0),
    max: z.number().int().min(0),
  }),
  z.object({
    rule: z.literal('oneOf'),
    var: NumberVar,
    values: z.array(z.number().int()).min(1),
  }),
]);
export type NumberConstraint = z.infer<typeof NumberConstraint>;

export const NMJLHand = z.object({
  id: z.string(),
  section: z.string(),
  line: z.number().int(),
  description: z.string(),
  closed: z.boolean(),
  groups: z.array(GroupPattern).min(1),
  suitConstraints: z.array(SuitConstraint).optional(),
  numberConstraints: z.array(NumberConstraint).optional(),
});
export type NMJLHand = z.infer<typeof NMJLHand>;

export const HandsFile = z.object({
  year: z.number().int(),
  hands: z.array(NMJLHand),
});
export type HandsFile = z.infer<typeof HandsFile>;
