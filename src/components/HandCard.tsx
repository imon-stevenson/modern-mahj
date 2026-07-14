import { useMemo } from 'react';
import { useMahjStore } from '../store';

// A scannable reference of the NMJL card hands. Per product decision we show
// the pattern only — never the point value.
export function HandCard(): React.ReactElement {
  const load = useMahjStore((s) => s.loadHandsSafe);
  const hands = useMemo(() => load(), [load]);

  return (
    <div
      className="card-surface"
      style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 520 }}
    >
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--hairline)' }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>
          The Card
        </div>
        <div style={{ font: '800 15px var(--font-ui)' }}>
          Hands{' '}
          <span className="mono" style={{ font: '600 13px var(--font-mono)', color: 'var(--ink-faint)' }}>
            {hands.length}
          </span>
        </div>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto' }}>
        {hands.map((h) => (
          <li key={h.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--hairline)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                font: '600 11px var(--font-ui)',
                color: 'var(--ink-faint)',
                marginBottom: 4,
              }}
            >
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h.section}</span>
              <span>· L{h.line}</span>
              <span
                style={{
                  marginLeft: 'auto',
                  font: '700 10px var(--font-ui)',
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: h.closed ? 'oklch(0.32 0.07 255 / 0.12)' : 'oklch(0.5 0.14 150 / 0.14)',
                  color: h.closed ? 'var(--tile-navy)' : 'var(--suit-green)',
                }}
                title={h.closed ? 'Concealed hand' : 'Exposed hand allowed'}
              >
                {h.closed ? 'CONCEALED' : 'EXPOSED'}
              </span>
            </div>
            <div style={{ font: '600 13px var(--font-ui)', color: 'var(--ink)' }}>{h.description}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
