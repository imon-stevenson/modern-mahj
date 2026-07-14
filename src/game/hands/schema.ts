import { z } from 'zod';
import type { DragonColor, Suit, Wind } from '../types';

// Suits, numbers, winds and dragon colors can be VARIABLES on a hand entry.
// At match time we bind each variable to a concrete value and check whether
// the player's tiles fit. Suit vars are X/Y/Z; number vars are N and its
// offsets; there is one wind var (WV) and one dragon var (DV) used by hands
// like "…Any Wind" or "…Any Dragon".

export const SuitVar = z.enum(['X', 'Y', 'Z']);
export type SuitVar = z.infer<typeof SuitVar>;

export const NumberVar = z.enum(['N', 'N+1', 'N+2', 'N+3', 'N+4']);
export type NumberVar = z.infer<typeof NumberVar>;

export const WindVar = z.enum(['WV']);
export type WindVar = z.infer<typeof WindVar>;

export const DragonVar = z.enum(['DV']);
export type DragonVar = z.infer<typeof DragonVar>;

const Suit_z = z.enum(['bams', 'craks', 'dots']) satisfies z.ZodType<Suit>;
const Wind_z = z.enum(['N', 'E', 'S', 'W']) satisfies z.ZodType<Wind>;
const Dragon_z = z.enum(['red', 'green', 'white']) satisfies z.ZodType<DragonColor>;

// A TilePattern describes what a single tile slot must look like. Rank 0 by
// convention represents the White Dragon (soap) when used as a "zero" digit.
// Uses z.union rather than z.discriminatedUnion because several variants
// share the same `kind` value (e.g. number with fixed rank vs. numVar).
export const TilePattern = z.union([
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
  z.object({
    kind: z.literal('number'),
    rank: z.number().int().min(0).max(9),
    suit: Suit_z,
  }),
  z.object({ kind: z.literal('wind'), wind: Wind_z }),
  z.object({ kind: z.literal('wind'), windVar: WindVar }),
  z.object({ kind: z.literal('dragon'), color: Dragon_z }),
  z.object({ kind: z.literal('dragon'), suitVar: SuitVar }),
  z.object({ kind: z.literal('dragon'), dragonVar: DragonVar }),
  z.object({ kind: z.literal('flower') }),
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
  value: z.number().int(),
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
