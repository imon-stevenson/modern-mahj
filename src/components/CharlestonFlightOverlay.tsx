import type { CSSProperties } from 'react';
import {
  CHARLESTON_FLIGHT_DURATION_MS,
  FLIGHT_STAGGER_MS,
  FLIGHT_TILE_WIDTH,
  useCharlestonFlightStore,
} from '../store/charlestonFlight';
import { TileView } from './Tile';

// Fixed overlay that renders clones of the human's passed tiles and floats them
// from their captured rack position toward the recipient seat's panel. The
// motion is a pure CSS keyframe (see `charleston-float` in index.css); each
// clone supplies its own delta via the --fx/--fy custom properties.
export function CharlestonFlightOverlay(): React.ReactElement | null {
  const active = useCharlestonFlightStore((s) => s.active);
  const flights = useCharlestonFlightStore((s) => s.flights);
  const toX = useCharlestonFlightStore((s) => s.toX);
  const toY = useCharlestonFlightStore((s) => s.toY);

  if (!active) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200 }}>
      {flights.map((f, i) => {
        const style: CSSProperties = {
          position: 'absolute',
          left: f.fromX,
          top: f.fromY,
          animation: `charleston-float ${CHARLESTON_FLIGHT_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1) ${i * FLIGHT_STAGGER_MS}ms forwards`,
          filter: 'drop-shadow(0 6px 12px rgba(20, 20, 40, 0.4))',
          willChange: 'transform, opacity',
        };
        // Per-tile travel deltas, consumed by the keyframe.
        (style as Record<string, string>)['--fx'] = `${toX - f.fromX}px`;
        (style as Record<string, string>)['--fy'] = `${toY - f.fromY}px`;
        return (
          <div key={f.key} style={style}>
            <TileView tile={f.tile} width={FLIGHT_TILE_WIDTH} />
          </div>
        );
      })}
    </div>
  );
}
