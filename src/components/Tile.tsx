import type { Tile } from '../game/types';
import { tileLabel } from '../game/tiles';

type Props = {
  tile: Tile;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  facedown?: boolean;
};

export function TileView({ tile, selected, onClick, disabled, facedown }: Props): React.ReactElement {
  const label = facedown ? '?' : tileLabel(tile);
  const style: React.CSSProperties = {
    display: 'inline-block',
    minWidth: 32,
    padding: '4px 6px',
    margin: 2,
    border: '1px solid #444',
    borderRadius: 4,
    background: selected ? '#ffe066' : facedown ? '#333' : '#fff',
    color: facedown ? '#999' : '#111',
    fontFamily: 'ui-monospace, monospace',
    textAlign: 'center',
  };
  if (onClick && !disabled) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} style={style}>
        {label}
      </button>
    );
  }
  return <span style={style}>{label}</span>;
}
