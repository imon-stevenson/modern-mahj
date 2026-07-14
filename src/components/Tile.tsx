import type { CSSProperties } from 'react';
import type { Tile } from '../game/types';
import { tileLabel } from '../game/tiles';

type Props = {
  tile: Tile;
  width?: number;
  faceDown?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

const INK_GREEN = 'oklch(0.5 0.14 150)';
const INK_RED = 'oklch(0.55 0.19 25)';
const INK_BLACK = 'oklch(0.2 0 0)';

const CRAK_CHARS: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '伍',
  6: '六', 7: '七', 8: '八', 9: '九',
};
const WIND_CHARS: Record<string, string> = { E: '東', S: '南', W: '西', N: '北' };

// 1-indexed CSS grid positions (row, col, color) on a 3x3 grid — canonical dot layouts.
const DOT_LAYOUTS: Record<number, [number, number, 'g' | 'r'][]> = {
  1: [[2, 2, 'r']],
  2: [[1, 1, 'g'], [3, 3, 'r']],
  3: [[1, 1, 'g'], [2, 2, 'r'], [3, 3, 'g']],
  4: [[1, 1, 'r'], [1, 3, 'g'], [3, 1, 'g'], [3, 3, 'r']],
  5: [[1, 1, 'r'], [1, 3, 'g'], [2, 2, 'g'], [3, 1, 'g'], [3, 3, 'r']],
  6: [[1, 1, 'g'], [2, 1, 'g'], [3, 1, 'g'], [1, 3, 'g'], [2, 3, 'g'], [3, 3, 'g']],
  7: [[1, 1, 'r'], [1, 2, 'r'], [2, 1, 'r'], [2, 2, 'g'], [2, 3, 'g'], [3, 2, 'g'], [3, 3, 'g']],
  8: [[1, 1, 'r'], [1, 2, 'g'], [1, 3, 'r'], [2, 1, 'g'], [2, 3, 'g'], [3, 1, 'r'], [3, 2, 'g'], [3, 3, 'r']],
  9: [[1, 1, 'r'], [1, 2, 'g'], [1, 3, 'r'], [2, 1, 'g'], [2, 2, 'r'], [2, 3, 'g'], [3, 1, 'r'], [3, 2, 'g'], [3, 3, 'r']],
};

type Face = {
  category: 'dot' | 'bam' | 'crak' | 'wind' | 'dragon' | 'flower' | 'joker';
  num: number;
  dir: string;
  dragon: 'red' | 'green' | 'soap';
};

function faceOf(tile: Tile): Face {
  switch (tile.kind) {
    case 'number': {
      const cat = tile.suit === 'dots' ? 'dot' : tile.suit === 'bams' ? 'bam' : 'crak';
      return { category: cat, num: tile.rank, dir: 'E', dragon: 'red' };
    }
    case 'wind':
      return { category: 'wind', num: 0, dir: tile.wind, dragon: 'red' };
    case 'dragon':
      return {
        category: 'dragon',
        num: 0,
        dir: 'E',
        dragon: tile.color === 'white' ? 'soap' : tile.color,
      };
    case 'flower':
      return { category: 'flower', num: 0, dir: 'E', dragon: 'red' };
    case 'joker':
      return { category: 'joker', num: 0, dir: 'E', dragon: 'red' };
  }
}

export function TileView({
  tile,
  width = 64,
  faceDown = false,
  selected = false,
  dimmed = false,
  onClick,
  disabled,
}: Props): React.ReactElement {
  const w = width;
  const h = Math.round(w * 1.375);
  const scale = w / 64;
  const px = (n: number) => Math.round(n * scale);

  const { category, num, dir, dragon } = faceOf(tile);
  const interactive = !!onClick && !disabled;

  const outer: CSSProperties = {
    position: 'relative',
    width: w,
    height: h,
    padding: 0,
    border: 'none',
    background: 'transparent',
    transform: selected ? 'translateY(-8px)' : 'translateY(0)',
    transition: 'transform 140ms ease, box-shadow 140ms ease, filter 140ms ease',
    filter: dimmed ? 'grayscale(0.15) brightness(0.9)' : 'none',
    cursor: interactive ? 'pointer' : 'default',
    flex: '0 0 auto',
  };

  const cornerSize = Math.max(9, px(11));
  const cornerLabel =
    category === 'dot' || category === 'bam' || category === 'crak'
      ? String(num)
      : category === 'wind'
        ? dir
        : '';
  const cornerColor =
    category === 'dot' ? INK_BLACK : category === 'bam' ? INK_GREEN : INK_RED;
  const cjkSize = px(22);

  const inner = faceDown ? (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 7,
        background: 'linear-gradient(155deg, oklch(0.36 0.07 255), oklch(0.22 0.06 258))',
        boxShadow: '0 3px 6px rgba(20,20,35,0.35), inset 0 1px 1px rgba(255,255,255,0.18)',
        border: '1px solid oklch(0.18 0.05 258)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 7,
          borderRadius: 4,
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.055) 0px, rgba(255,255,255,0.055) 1px, transparent 1px, transparent 7px)',
        }}
      />
    </div>
  ) : (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 7,
        background: 'oklch(0.99 0.004 90)',
        boxShadow: '0 2px 4px rgba(30,35,55,0.22), 0 1px 0 rgba(255,255,255,0.6) inset',
        border: '1px solid oklch(0.9 0.006 90)',
        overflow: 'hidden',
        outline: selected ? '2px solid oklch(0.7 0.14 80)' : undefined,
        outlineOffset: selected ? 2 : undefined,
      }}
    >
      {/* beveled navy base strip */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '22%',
          background: 'linear-gradient(180deg, oklch(0.4 0.08 255), oklch(0.27 0.07 258))',
          boxShadow: '0 -1px 2px rgba(0,0,0,0.15) inset',
        }}
      />

      {cornerLabel && (
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: 5,
            font: `700 ${cornerSize}px var(--font-ui)`,
            color: cornerColor,
            lineHeight: 1,
          }}
        >
          {cornerLabel}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          inset: '0 0 22% 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {category === 'dot' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(3, 1fr)',
              width: px(30),
              height: px(30),
              padding: 2,
            }}
          >
            {(DOT_LAYOUTS[num] || []).map(([row, col, c], i) => (
              <div
                key={i}
                style={{
                  gridRow: row,
                  gridColumn: col,
                  alignSelf: 'center',
                  justifySelf: 'center',
                  width: px(9),
                  height: px(9),
                  borderRadius: '50%',
                  background: c === 'g' ? INK_GREEN : INK_RED,
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                }}
              />
            ))}
          </div>
        )}

        {category === 'bam' && num === 1 && <BamBird scale={scale} />}

        {category === 'bam' && num !== 1 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${num <= 3 ? num : 3}, 1fr)`,
              gap: px(3),
              padding: 4,
            }}
          >
            {Array.from({ length: num }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: px(8),
                  height: px(16),
                  borderRadius: 3,
                  background: INK_GREEN,
                  boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.08), inset 0 ${Math.max(3, px(5))}px 0 -1px rgba(0,0,0,0.22), inset 0 -${Math.max(3, px(5))}px 0 -1px rgba(0,0,0,0.22)`,
                }}
              />
            ))}
          </div>
        )}

        {category === 'crak' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <div style={{ font: `700 ${px(15)}px var(--font-ui)`, color: INK_RED, lineHeight: 1 }}>
              {CRAK_CHARS[num]}
            </div>
            <div style={{ font: `400 ${cjkSize}px 'Noto Sans SC', var(--font-ui)`, color: INK_BLACK, lineHeight: 1 }}>
              萬
            </div>
          </div>
        )}

        {category === 'wind' && (
          <div style={{ font: `400 ${cjkSize}px 'Noto Sans SC', var(--font-ui)`, color: INK_BLACK, lineHeight: 1 }}>
            {WIND_CHARS[dir] || dir}
          </div>
        )}

        {category === 'dragon' && dragon !== 'soap' && (
          <div
            style={{
              font: `400 ${cjkSize}px 'Noto Sans SC', var(--font-ui)`,
              color: dragon === 'green' ? INK_GREEN : INK_RED,
              lineHeight: 1,
            }}
          >
            {dragon === 'green' ? '發' : '中'}
          </div>
        )}

        {category === 'dragon' && dragon === 'soap' && (
          <div
            style={{
              width: px(20),
              height: px(20),
              border: `${Math.max(1, px(2))}px solid ${INK_BLACK}`,
              borderRadius: 3,
            }}
          />
        )}

        {category === 'flower' && <Flower scale={scale} />}

        {category === 'joker' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: px(22), height: 3, borderRadius: 2, background: INK_GREEN }} />
            <div
              style={{
                font: `800 ${Math.max(7, px(8.5))}px var(--font-ui)`,
                color: INK_RED,
                letterSpacing: '0.02em',
              }}
            >
              JOKER
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const label = faceDown ? 'Face-down tile' : tileLabel(tile);

  if (interactive) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} style={outer} title={label} aria-label={label}>
        {inner}
      </button>
    );
  }
  return (
    <span style={outer} title={label} aria-label={label} role="img">
      {inner}
    </span>
  );
}

function BamBird({ scale }: { scale: number }): React.ReactElement {
  const s = Math.round(30 * scale);
  return (
    <div style={{ position: 'relative', width: s, height: s }}>
      <div
        style={{
          position: 'absolute',
          left: '15%',
          bottom: '10%',
          width: Math.round(20 * scale),
          height: Math.round(14 * scale),
          borderRadius: '60% 60% 50% 50%',
          background: INK_GREEN,
          transform: 'rotate(-8deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '10%',
          top: '8%',
          width: Math.round(13 * scale),
          height: Math.round(13 * scale),
          borderRadius: '50%',
          background: INK_GREEN,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '2%',
          top: '22%',
          width: 0,
          height: 0,
          borderTop: '3px solid transparent',
          borderBottom: '3px solid transparent',
          borderLeft: `6px solid ${INK_RED}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '8%',
          bottom: '2%',
          width: 12,
          height: 3,
          borderRadius: 2,
          background: INK_RED,
          transform: 'rotate(35deg)',
        }}
      />
    </div>
  );
}

function Flower({ scale }: { scale: number }): React.ReactElement {
  const box = Math.round(26 * scale);
  const petal = Math.round(13 * scale);
  const neg = -Math.round(6.5 * scale);
  const center = Math.round(9 * scale);
  const centerNeg = -Math.round(4.5 * scale);
  return (
    <div style={{ position: 'relative', width: box, height: box }}>
      <div style={{ position: 'absolute', top: 0, left: '50%', width: petal, height: petal, marginLeft: neg, borderRadius: '50%', background: INK_RED }} />
      <div style={{ position: 'absolute', bottom: 0, left: '50%', width: petal, height: petal, marginLeft: neg, borderRadius: '50%', background: INK_GREEN }} />
      <div style={{ position: 'absolute', left: 0, top: '50%', width: petal, height: petal, marginTop: neg, borderRadius: '50%', background: INK_GREEN }} />
      <div style={{ position: 'absolute', right: 0, top: '50%', width: petal, height: petal, marginTop: neg, borderRadius: '50%', background: INK_RED }} />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: center,
          height: center,
          marginTop: centerNeg,
          marginLeft: centerNeg,
          borderRadius: '50%',
          background: 'oklch(0.75 0.14 85)',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
        }}
      />
    </div>
  );
}
