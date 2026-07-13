import { useMemo } from 'react';
import { useMahjStore } from '../store';

// Human-readable summary of a single NMJL hand entry: kinds + count + tile
// pattern shorthand. It's here as a scannable reference alongside the game.
export function HandCard(): React.ReactElement {
  const load = useMahjStore((s) => s.loadHandsSafe);
  const hands = useMemo(() => load(), [load]);
  return (
    <div style={{ border: '1px solid #333', padding: 8, margin: 4, maxHeight: 320, overflow: 'auto' }}>
      <div>
        <strong>Card Hands ({hands.length})</strong>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {hands.map((h) => (
          <li key={h.id} style={{ borderBottom: '1px dotted #999', padding: '4px 0' }}>
            <div>
              <small style={{ opacity: 0.6 }}>
                {h.section} · L{h.line} {h.closed ? '· closed' : ''}
              </small>
            </div>
            <div>{h.description}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
