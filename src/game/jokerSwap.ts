import type { Exposure, PlayerState, Seat, Tile } from './types';
import { tilesEqual } from './tiles';

// Return the natural (non-joker) tile identity an exposure represents, or
// null if the exposure is somehow all jokers (shouldn't happen in play).
export function exposureIdentity(exposure: Exposure): Tile | null {
  return exposure.tiles.find((t) => t.kind !== 'joker') ?? null;
}

export type JokerSwapOffer = {
  offeringSeat: Seat;
  offeredTileId: string;
  targetSeat: Seat;
  exposureIndex: number;
  jokerId: string;
};

export type SwapValidation = { ok: true } | { ok: false; reason: string };

export function validateJokerSwap(
  players: Record<Seat, PlayerState>,
  offer: JokerSwapOffer,
): SwapValidation {
  const offering = players[offer.offeringSeat];
  const tile = offering.rack.find((t) => t.id === offer.offeredTileId);
  if (!tile) return { ok: false, reason: 'offered tile not in rack' };
  if (tile.kind === 'joker') return { ok: false, reason: 'cannot offer a joker' };

  const target = players[offer.targetSeat];
  const exposure = target.exposures[offer.exposureIndex];
  if (!exposure) return { ok: false, reason: 'no such exposure' };
  if (!exposure.jokerIds.includes(offer.jokerId)) {
    return { ok: false, reason: 'joker id not in exposure' };
  }
  const identity = exposureIdentity(exposure);
  if (!identity) return { ok: false, reason: 'exposure has no identity' };
  if (!tilesEqual(tile, identity)) {
    return { ok: false, reason: 'offered tile does not match exposure identity' };
  }
  return { ok: true };
}

// Apply the swap: remove offered tile from offering rack, add joker there,
// swap the tile into the exposure's joker slot.
export function applyJokerSwap(
  players: Record<Seat, PlayerState>,
  offer: JokerSwapOffer,
): Record<Seat, PlayerState> {
  const v = validateJokerSwap(players, offer);
  if (!v.ok) throw new Error(`invalid joker swap: ${v.reason}`);

  const offering = players[offer.offeringSeat];
  const target = players[offer.targetSeat];
  const exposure = target.exposures[offer.exposureIndex]!;

  const offeredTile = offering.rack.find((t) => t.id === offer.offeredTileId)!;
  const jokerTile = exposure.tiles.find((t) => t.id === offer.jokerId)!;

  const newExposureTiles = exposure.tiles.map((t) =>
    t.id === offer.jokerId ? offeredTile : t,
  );
  const newExposure: Exposure = {
    ...exposure,
    tiles: newExposureTiles,
    jokerIds: exposure.jokerIds.filter((id) => id !== offer.jokerId),
  };

  const next: Record<Seat, PlayerState> = { ...players };

  next[offer.offeringSeat] = {
    ...offering,
    rack: [...offering.rack.filter((t) => t.id !== offer.offeredTileId), jokerTile],
  };

  // If offering === target we need to update the same player carefully — the
  // exposure list belongs to `target`, which is now the version stored above.
  const currentTarget =
    offer.offeringSeat === offer.targetSeat ? next[offer.targetSeat] : target;
  next[offer.targetSeat] = {
    ...currentTarget,
    exposures: currentTarget.exposures.map((e, i) =>
      i === offer.exposureIndex ? newExposure : e,
    ),
  };

  return next;
}
