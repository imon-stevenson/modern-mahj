import type { PlayerState, Seat } from '../game/types';
import { ExposureRow } from './ExposureRow';

export function OpponentRack({
  seat,
  player,
  isCurrent,
}: {
  seat: Seat;
  player: PlayerState;
  isCurrent: boolean;
}): React.ReactElement {
  return (
    <div
      style={{
        border: '1px solid #999',
        padding: 8,
        margin: 4,
        background: isCurrent ? '#eef' : 'transparent',
      }}
    >
      <div>
        <strong>{seat.toUpperCase()}</strong>
        {isCurrent ? ' (turn)' : ''} · {player.rack.length} tiles in rack
      </div>
      <ExposureRow exposures={player.exposures} />
    </div>
  );
}
