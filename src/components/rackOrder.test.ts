import { describe, it, expect } from 'vitest'
import type { Suit, Tile } from '../game/types'
import { applyRackOrder, defaultRackSort, reorderIds } from './rackOrder'

const n = (suit: Suit, rank: number, id: string): Tile =>
  ({ id, kind: 'number', suit, rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 })
const wind = (w: 'N' | 'E' | 'W' | 'S', id: string): Tile => ({ id, kind: 'wind', wind: w })
const joker = (id: string): Tile => ({ id, kind: 'joker' })
const flower = (id: string): Tile => ({ id, kind: 'flower' })

describe('defaultRackSort', () => {
  it('puts jokers on the far left', () => {
    const out = defaultRackSort([n('dots', 3, 'a'), joker('j1'), n('bams', 1, 'b')])
    expect(out[0]!.kind).toBe('joker')
  })

  it('groups numbers by suit in numerical order', () => {
    const out = defaultRackSort([
      n('dots', 2, 'd2'),
      n('bams', 5, 'b5'),
      n('bams', 1, 'b1'),
      n('craks', 9, 'c9'),
      n('dots', 1, 'd1'),
    ])
    expect(out.map((t) => t.id)).toEqual(['b1', 'b5', 'c9', 'd1', 'd2'])
  })

  it('orders winds NEWS', () => {
    const out = defaultRackSort([wind('S', 's'), wind('W', 'w'), wind('E', 'e'), wind('N', 'n')])
    expect(out.map((t) => t.id)).toEqual(['n', 'e', 'w', 's'])
  })

  it('puts flowers after winds/numbers', () => {
    const out = defaultRackSort([flower('f'), wind('N', 'n'), n('bams', 1, 'b')])
    expect(out.map((t) => t.kind)).toEqual(['number', 'wind', 'flower'])
  })
})

describe('applyRackOrder', () => {
  const rack = [n('bams', 1, 'b1'), n('bams', 2, 'b2'), n('bams', 3, 'b3')]

  it('falls back to the default sort when order is null', () => {
    expect(applyRackOrder(rack, null).map((t) => t.id)).toEqual(['b1', 'b2', 'b3'])
  })

  it('respects an explicit manual order', () => {
    expect(applyRackOrder(rack, ['b3', 'b1', 'b2']).map((t) => t.id)).toEqual(['b3', 'b1', 'b2'])
  })

  it('appends unlisted (freshly drawn) tiles after ordered ones, default-sorted', () => {
    const withDrawn = [...rack, n('craks', 5, 'c5')]
    expect(applyRackOrder(withDrawn, ['b2', 'b1']).map((t) => t.id)).toEqual([
      'b2',
      'b1',
      'b3',
      'c5',
    ])
  })

  it('ignores ids for tiles no longer in the rack', () => {
    expect(applyRackOrder(rack, ['gone', 'b2', 'b1']).map((t) => t.id)).toEqual([
      'b2',
      'b1',
      'b3',
    ])
  })

  it('pins a drawn tile to the far right in default-sort mode', () => {
    // b2 would normally sort into the middle; pinned, it goes last.
    expect(applyRackOrder(rack, null, 'b2').map((t) => t.id)).toEqual(['b1', 'b3', 'b2'])
  })

  it('pins a drawn tile to the far right even past unlisted tiles', () => {
    const withDrawn = [...rack, n('craks', 5, 'c5')]
    expect(applyRackOrder(withDrawn, ['b1', 'b2', 'b3'], 'c5').map((t) => t.id)).toEqual([
      'b1',
      'b2',
      'b3',
      'c5',
    ])
  })

  it('does not pin when the player has explicitly placed the tile', () => {
    // b2 is in the manual order (player racked it), so it stays put.
    expect(applyRackOrder(rack, ['b2', 'b1', 'b3'], 'b2').map((t) => t.id)).toEqual([
      'b2',
      'b1',
      'b3',
    ])
  })
})

describe('reorderIds', () => {
  const ids = ['a', 'b', 'c', 'd']

  it('drops after the target when dragging rightward', () => {
    expect(reorderIds(ids, 'a', 'c')).toEqual(['b', 'c', 'a', 'd'])
  })

  it('drops before the target when dragging leftward', () => {
    expect(reorderIds(ids, 'd', 'b')).toEqual(['a', 'd', 'b', 'c'])
  })

  it('returns an unchanged copy for same or missing ids', () => {
    expect(reorderIds(ids, 'b', 'b')).toEqual(ids)
    expect(reorderIds(ids, 'z', 'b')).toEqual(ids)
    expect(reorderIds(ids, 'a', 'z')).toEqual(ids)
  })
})
