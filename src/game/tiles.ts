import type {
  DragonColor,
  DragonTile,
  FlowerTile,
  JokerTile,
  NumberTile,
  Suit,
  Tile,
  Wind,
  WindTile,
} from './types';

// American Mahjong tile set: 152 tiles total.
//   Numbers  108 = 3 suits × 9 ranks × 4 copies
//   Winds     16 = 4 winds × 4 copies
//   Dragons   12 = 3 colors × 4 copies
//   Flowers    8
//   Jokers     8

const SUITS: readonly Suit[] = ['bams', 'craks', 'dots'] as const;
const WINDS: readonly Wind[] = ['N', 'E', 'S', 'W'] as const;
const DRAGONS: readonly DragonColor[] = ['red', 'green', 'white'] as const;
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function createFullTileSet(): Tile[] {
  const tiles: Tile[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      for (let copy = 0; copy < 4; copy++) {
        const t: NumberTile = {
          id: `n-${suit}-${rank}-${copy}`,
          kind: 'number',
          suit,
          rank: rank as NumberTile['rank'],
        };
        tiles.push(t);
      }
    }
  }
  for (const wind of WINDS) {
    for (let copy = 0; copy < 4; copy++) {
      const t: WindTile = { id: `w-${wind}-${copy}`, kind: 'wind', wind };
      tiles.push(t);
    }
  }
  for (const color of DRAGONS) {
    for (let copy = 0; copy < 4; copy++) {
      const t: DragonTile = { id: `d-${color}-${copy}`, kind: 'dragon', color };
      tiles.push(t);
    }
  }
  for (let copy = 0; copy < 8; copy++) {
    const t: FlowerTile = { id: `f-${copy}`, kind: 'flower' };
    tiles.push(t);
  }
  for (let copy = 0; copy < 8; copy++) {
    const t: JokerTile = { id: `j-${copy}`, kind: 'joker' };
    tiles.push(t);
  }
  return tiles;
}

const SUIT_LABEL: Record<Suit, string> = { bams: 'B', craks: 'C', dots: 'D' };
const DRAGON_LABEL: Record<DragonColor, string> = {
  red: 'RD',
  green: 'GD',
  white: 'WD',
};

export function tileLabel(tile: Tile): string {
  switch (tile.kind) {
    case 'number':
      return `${tile.rank}${SUIT_LABEL[tile.suit]}`;
    case 'wind':
      return `${tile.wind}W`;
    case 'dragon':
      return DRAGON_LABEL[tile.color];
    case 'flower':
      return 'F';
    case 'joker':
      return 'J';
  }
}

// Two tiles are the "same" for pung/kong/discard purposes if their identity
// (kind + suit/rank/wind/color) matches. Jokers are their own identity here —
// joker substitution is handled at the exposure layer.
export function tilesEqual(a: Tile, b: Tile): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'number':
      return a.suit === (b as NumberTile).suit && a.rank === (b as NumberTile).rank;
    case 'wind':
      return a.wind === (b as WindTile).wind;
    case 'dragon':
      return a.color === (b as DragonTile).color;
    case 'flower':
    case 'joker':
      return true;
  }
}
