import { describe, it, expect } from 'vitest'
import type { Suit, Tile } from './types'
import { callFlashText, jokerSwapFlashText } from './actionText'

const n = (suit: Suit, rank: number, id = 't'): Tile =>
  ({ id, kind: 'number', suit, rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 })
const wind = (w: 'N' | 'E' | 'W' | 'S'): Tile => ({ id: 'w', kind: 'wind', wind: w })
const dragon = (color: 'red' | 'green' | 'white'): Tile => ({ id: 'd', kind: 'dragon', color })

describe('callFlashText', () => {
  it('names the call, the pluralized tile, and the discarder', () => {
    expect(callFlashText('pung', n('bams', 3), 'west')).toBe(
      "called a Pung of 3 Bams from West's discard",
    )
  })

  it('handles kongs', () => {
    expect(callFlashText('kong', n('craks', 1), 'south')).toBe(
      "called a Kong of 1 Craks from South's discard",
    )
  })

  it('pluralizes dragons and winds', () => {
    expect(callFlashText('pung', dragon('green'), 'north')).toContain(
      'Pung of Green Dragons',
    )
    expect(callFlashText('pung', dragon('white'), 'north')).toContain('Pung of Soaps')
    expect(callFlashText('quint', wind('E'), 'east')).toContain('Quint of East Winds')
  })

  it('pluralizes the Bird Bam by its special name', () => {
    expect(callFlashText('pung', n('bams', 1), 'east')).toBe(
      "called a Pung of Bird Bams from East's discard",
    )
  })

  it('reads as a declaration for mahjong, with a singular tile', () => {
    expect(callFlashText('mahjong', n('dots', 7), 'west')).toBe(
      "declared Mahjong on West's 7 Dot",
    )
  })
})

describe('jokerSwapFlashText', () => {
  it('names the tile given and whose joker was taken', () => {
    expect(jokerSwapFlashText(n('craks', 1), 'east', 'south')).toBe(
      "replaced a 1 Crak for East's Joker",
    )
  })

  it("says 'their own' when redeeming from its own exposure", () => {
    expect(jokerSwapFlashText(n('bams', 3), 'north', 'north')).toBe(
      'replaced a 3 Bam for their own Joker',
    )
  })
})
