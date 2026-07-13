export type Suit = 'bams' | 'craks' | 'dots';
export type Wind = 'N' | 'E' | 'S' | 'W';
export type DragonColor = 'red' | 'green' | 'white';
export type Seat = 'east' | 'south' | 'west' | 'north';
export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export type NumberTile = {
  id: string;
  kind: 'number';
  suit: Suit;
  rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
};
export type WindTile = { id: string; kind: 'wind'; wind: Wind };
export type DragonTile = { id: string; kind: 'dragon'; color: DragonColor };
export type FlowerTile = { id: string; kind: 'flower' };
export type JokerTile = { id: string; kind: 'joker' };

export type Tile = NumberTile | WindTile | DragonTile | FlowerTile | JokerTile;

export type ExposureKind = 'pair' | 'pung' | 'kong' | 'quint' | 'sextet';

export type Exposure = {
  kind: ExposureKind;
  tiles: Tile[];
  jokerIds: string[];
};

export type PlayerState = {
  seat: Seat;
  rack: Tile[];
  exposures: Exposure[];
  isBot: boolean;
};

export type GamePhase = 'setup' | 'charleston' | 'play' | 'ended';

export type CallKind = 'pung' | 'kong' | 'mahjong';

export type AwaitingCall = {
  discardId: string;
  discardTile: Tile;
  callableBy: Seat[];
  deadline: number | null;
} | null;

export type CharlestonPass =
  | 'firstRight'
  | 'firstAcross'
  | 'firstLeft'
  | 'secondLeft'
  | 'secondAcross'
  | 'secondRight'
  | 'courtesy';

export const SEATS: readonly Seat[] = ['east', 'south', 'west', 'north'] as const;
