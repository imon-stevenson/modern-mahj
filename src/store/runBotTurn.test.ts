import { describe, expect, it } from 'vitest'
import { useMahjStore } from './index'
import type { Tile, Wind } from '../game/types'

let counter = 0
const w = (wind: Wind): Tile => ({ id: `w${counter++}`, kind: 'wind', wind })

describe('runBotTurn — a bot win ends the game', () => {
  it('sets phase ended + winner when a bot arrives with a completed hand', () => {
    // Winds-Dragons-1a on the 2026 card: NNNN EEE WWW SSSS — 14 tiles, no
    // suit/number variables, so this rack is an unambiguous winning hand.
    const rack: Tile[] = [
      w('N'), w('N'), w('N'), w('N'),
      w('E'), w('E'), w('E'),
      w('W'), w('W'), w('W'),
      w('S'), w('S'), w('S'), w('S'),
    ]
    const base = useMahjStore.getState()
    useMahjStore.setState({
      phase: 'play',
      currentSeat: 'north',
      cardYear: 2026,
      awaitingCall: null,
      paused: false,
      players: {
        ...base.players,
        north: { seat: 'north', rack, exposures: [], isBot: true },
      },
    })

    // Before the fix this fell through to an impossible discard (leaving the
    // game in "play" and, with an empty rack, throwing on `discard.id`).
    useMahjStore.getState().runBotTurn('north')

    const after = useMahjStore.getState()
    expect(after.phase).toBe('ended')
    expect(after.winner).toBe('north')
    expect(after.winningHand?.id).toBe('winds-dragons-1a')
  })
})
