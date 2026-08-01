import type { CSSProperties } from 'react'
import {
  DISCARD_FLIGHT_DURATION_MS,
  DISCARD_TILE_WIDTH,
  useDiscardFlightStore,
} from '../store/discardFlight'
import { TileView } from './Tile'

// Fixed overlay that floats a clone of the just-discarded tile from the
// discarding player's seat to the center discard pile. Motion is a pure CSS
// keyframe (`discard-float` in index.css); the clone supplies its --fx/--fy
// travel deltas.
export function DiscardFlightOverlay(): React.ReactElement | null {
  const flight = useDiscardFlightStore((s) => s.flight)
  if (!flight) return null

  const style: CSSProperties = {
    position: 'absolute',
    left: flight.fromX,
    top: flight.fromY,
    animation: `discard-float ${DISCARD_FLIGHT_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
    filter: 'drop-shadow(0 6px 12px rgba(20, 20, 40, 0.4))',
    willChange: 'transform',
  }
  const styleVars = style as Record<string, string>
  styleVars['--fx'] = `${flight.toX - flight.fromX}px`
  styleVars['--fy'] = `${flight.toY - flight.fromY}px`

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 150 }}>
      <div style={style}>
        <TileView tile={flight.tile} width={DISCARD_TILE_WIDTH} />
      </div>
    </div>
  )
}
