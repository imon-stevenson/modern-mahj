import type { Tile } from '../game/types'

// Default left-to-right ordering for the human's rack:
//   jokers first, then number tiles grouped by suit in numerical order,
//   then winds (N, E, W, S), then dragons, then flowers.
const KIND_RANK: Record<Tile['kind'], number> = {
  joker: 0,
  number: 1,
  wind: 2,
  dragon: 3,
  flower: 4,
}
const SUIT_RANK: Record<string, number> = { bams: 0, craks: 1, dots: 2 }
const WIND_RANK: Record<string, number> = { N: 0, E: 1, W: 2, S: 3 } // NEWS
const DRAGON_RANK: Record<string, number> = { red: 0, green: 1, white: 2 }

function subRank(t: Tile): number {
  switch (t.kind) {
    case 'number':
      return (SUIT_RANK[t.suit] ?? 0) * 10 + t.rank
    case 'wind':
      return WIND_RANK[t.wind] ?? 0
    case 'dragon':
      return DRAGON_RANK[t.color] ?? 0
    default:
      return 0
  }
}

export function defaultRackSort(rack: readonly Tile[]): Tile[] {
  return [...rack].sort((a, b) => {
    const ka = KIND_RANK[a.kind]
    const kb = KIND_RANK[b.kind]
    if (ka !== kb) return ka - kb
    const sa = subRank(a)
    const sb = subRank(b)
    if (sa !== sb) return sa - sb
    return a.id.localeCompare(b.id) // stable tie-break
  })
}

// Order the rack for display. When `order` is null the default sort is used.
// Otherwise tiles are laid out following `order`; any tile not present in the
// list (e.g. a tile just drawn from the wall) is appended, default-sorted,
// after the explicitly ordered tiles.
// `pinnedTileId`, when given, forces that tile to the far-right position — used
// so a freshly drawn tile sits apart on the right until the player racks it
// (by dragging, which records it in `order`) or their turn ends.
export function applyRackOrder(
  rack: readonly Tile[],
  order: string[] | null | undefined,
  pinnedTileId?: string | null,
): Tile[] {
  let result: Tile[]
  if (!order || order.length === 0) {
    result = defaultRackSort(rack)
  } else {
    const pos = new Map(order.map((id, i) => [id, i]))
    const listed = rack.filter((t) => pos.has(t.id))
    listed.sort((a, b) => pos.get(a.id)! - pos.get(b.id)!)
    const rest = defaultRackSort(rack.filter((t) => !pos.has(t.id)))
    result = [...listed, ...rest]
  }
  // Pin the drawn tile right unless the player has explicitly placed it in
  // their manual order (then respect that placement).
  if (pinnedTileId && !(order && order.includes(pinnedTileId))) {
    const idx = result.findIndex((t) => t.id === pinnedTileId)
    if (idx >= 0 && idx !== result.length - 1) {
      const [tile] = result.splice(idx, 1)
      result.push(tile)
    }
  }
  return result
}
