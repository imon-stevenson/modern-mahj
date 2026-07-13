import type { Exposure, ExposureKind, Tile } from './types';
import { tilesEqual } from './tiles';

const REQUIRED_SIZE: Record<ExposureKind, number> = {
  pair: 2,
  pung: 3,
  kong: 4,
  quint: 5,
  sextet: 6,
};

// Only these exposure kinds may include jokers per NMJL rules.
const ALLOWS_JOKERS: Record<ExposureKind, boolean> = {
  pair: false,
  pung: true,
  kong: true,
  quint: true,
  sextet: true,
};

export type ValidationResult = { ok: true } | { ok: false; reason: string };

// Validate that `tiles` form an exposure of `kind` claiming identity `target`.
// - Correct count.
// - Every non-joker tile matches the target identity.
// - No jokers allowed in pairs.
export function validateExposure(
  kind: ExposureKind,
  tiles: Tile[],
  target: Tile,
): ValidationResult {
  const required = REQUIRED_SIZE[kind];
  if (tiles.length !== required) {
    return { ok: false, reason: `${kind} requires ${required} tiles, got ${tiles.length}` };
  }
  const jokers = tiles.filter((t) => t.kind === 'joker');
  if (jokers.length > 0 && !ALLOWS_JOKERS[kind]) {
    return { ok: false, reason: `${kind} does not allow jokers` };
  }
  const naturals = tiles.filter((t) => t.kind !== 'joker');
  for (const t of naturals) {
    if (!tilesEqual(t, target)) {
      return { ok: false, reason: `natural tile does not match target identity` };
    }
  }
  return { ok: true };
}

export function buildExposure(
  kind: ExposureKind,
  tiles: Tile[],
  target: Tile,
): Exposure {
  const result = validateExposure(kind, tiles, target);
  if (!result.ok) throw new Error(`invalid exposure: ${result.reason}`);
  return {
    kind,
    tiles,
    jokerIds: tiles.filter((t) => t.kind === 'joker').map((t) => t.id),
  };
}
