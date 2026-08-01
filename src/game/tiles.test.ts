import { describe, expect, it } from 'vitest'
import {
  DRAGON_LABEL,
  SUIT_LABEL,
  WIND_LABEL,
  createFullTileSet,
  tileLabel,
  tilesEqual,
} from './tiles'
import type { DragonColor, NumberTile, Suit, Wind } from './types'

describe('createFullTileSet', () => {
  const tiles = createFullTileSet()

  it('produces exactly 152 tiles', () => {
    expect(tiles).toHaveLength(152)
  })

  it('produces unique ids', () => {
    const ids = new Set(tiles.map((t) => t.id))
    expect(ids.size).toBe(152)
  })

  it('has the right count per category', () => {
    const byKind = tiles.reduce<Record<string, number>>((acc, t) => {
      acc[t.kind] = (acc[t.kind] ?? 0) + 1
      return acc
    }, {})
    expect(byKind).toEqual({
      number: 108,
      wind: 16,
      dragon: 12,
      flower: 8,
      joker: 8,
    })
  })

  it('has 4 of every specific number tile', () => {
    const key = (t: (typeof tiles)[number]) =>
      t.kind === 'number' ? `${t.suit}-${t.rank}` : null
    const counts = new Map<string, number>()
    for (const t of tiles) {
      const k = key(t)
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    for (const count of counts.values()) expect(count).toBe(4)
    expect(counts.size).toBe(27)
  })
})

describe('tileLabel', () => {
  it('labels number tiles as "<rank> <Suit>" for every suit and rank', () => {
    for (const suit of Object.keys(SUIT_LABEL) as Suit[]) {
      for (let rank = 1; rank <= 9; rank++) {
        // 1 Bam has a colloquial name ("Bird Bam") that isn't derived from the
        // suit label, so it's excluded from this generic check.
        if (suit === 'bams' && rank === 1) continue
        const tile: NumberTile = {
          id: 'x',
          kind: 'number',
          suit,
          rank: rank as NumberTile['rank'],
        }
        expect(tileLabel(tile)).toBe(`${rank} ${SUIT_LABEL[suit]}`)
      }
    }
  })

  it('labels winds as "<Direction> Wind"', () => {
    for (const wind of Object.keys(WIND_LABEL) as Wind[]) {
      expect(tileLabel({ id: 'x', kind: 'wind', wind })).toBe(`${WIND_LABEL[wind]} Wind`)
    }
  })

  it('labels dragons by their name', () => {
    for (const color of Object.keys(DRAGON_LABEL) as DragonColor[]) {
      expect(tileLabel({ id: 'x', kind: 'dragon', color })).toBe(DRAGON_LABEL[color])
    }
  })

  it('labels flowers and jokers', () => {
    expect(tileLabel({ id: 'x', kind: 'flower' })).toBe('Flower')
    expect(tileLabel({ id: 'x', kind: 'joker' })).toBe('Joker')
  })
})

describe('tilesEqual', () => {
  it('matches by identity, not id', () => {
    expect(
      tilesEqual(
        { id: 'a', kind: 'number', suit: 'bams', rank: 5 },
        { id: 'b', kind: 'number', suit: 'bams', rank: 5 },
      ),
    ).toBe(true)
    expect(
      tilesEqual(
        { id: 'a', kind: 'number', suit: 'bams', rank: 5 },
        { id: 'b', kind: 'number', suit: 'craks', rank: 5 },
      ),
    ).toBe(false)
  })
})
