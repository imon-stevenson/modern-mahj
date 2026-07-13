import type { Exposure, Suit, Tile } from '../types';
import type { NMJLHand, NumberVar, SuitVar } from '../hands/schema';
import { tilesEqual } from '../tiles';

// A simple "tile usefulness" heuristic for intermediate/expert bots.
//
// For every hand and every legal (suit, number) binding, materialize the set
// of tile identities the hand asks for. A rack tile's usefulness = the number
// of times its identity shows up across all materialized hand slots.
//
// This makes bots discard the tile that fits into the fewest possible hands
// and keep tiles that fit into many, without any deep planning.

const ALL_SUITS: readonly Suit[] = ['bams', 'craks', 'dots'];

type TileKey = string;

function tileKey(tile: Tile): TileKey {
  switch (tile.kind) {
    case 'number':
      return `n:${tile.suit}:${tile.rank}`;
    case 'wind':
      return `w:${tile.wind}`;
    case 'dragon':
      return `d:${tile.color}`;
    case 'flower':
      return 'f';
    case 'joker':
      return 'j';
  }
}

function tileFromKey(k: TileKey): Tile | null {
  const [kind, a, b] = k.split(':');
  if (kind === 'n' && a && b) {
    return {
      id: '_score',
      kind: 'number',
      suit: a as Suit,
      rank: Number(b) as 1|2|3|4|5|6|7|8|9,
    };
  }
  if (kind === 'w' && a) return { id: '_score', kind: 'wind', wind: a as 'N'|'E'|'S'|'W' };
  if (kind === 'd' && a) return { id: '_score', kind: 'dragon', color: a as 'red'|'green'|'white' };
  if (kind === 'f') return { id: '_score', kind: 'flower' };
  if (kind === 'j') return { id: '_score', kind: 'joker' };
  return null;
}

function enumerateSuitBindings(vars: SuitVar[]): Partial<Record<SuitVar, Suit>>[] {
  if (vars.length === 0) return [{}];
  const out: Partial<Record<SuitVar, Suit>>[] = [];
  const walk = (i: number, cur: Partial<Record<SuitVar, Suit>>) => {
    if (i === vars.length) {
      out.push({ ...cur });
      return;
    }
    for (const s of ALL_SUITS) {
      cur[vars[i]!] = s;
      walk(i + 1, cur);
    }
  };
  walk(0, {});
  return out;
}

function suitBindingSatisfies(
  binding: Partial<Record<SuitVar, Suit>>,
  hand: NMJLHand,
): boolean {
  for (const c of hand.suitConstraints ?? []) {
    const values = c.vars.map((v) => binding[v]).filter((x): x is Suit => !!x);
    if (values.length < c.vars.length) return true;
    if (c.rule === 'allDifferent') {
      if (new Set(values).size !== values.length) return false;
    } else {
      if (new Set(values).size !== 1) return false;
    }
  }
  return true;
}

function nValuesFor(hand: NMJLHand): number[] {
  let candidates = new Set<number>();
  for (let n = 1; n <= 9; n++) candidates.add(n);
  for (const c of hand.numberConstraints ?? []) {
    if (c.var !== 'N') continue;
    if (c.rule === 'range') {
      candidates = new Set([...candidates].filter((n) => n >= c.min && n <= c.max));
    } else {
      candidates = new Set([...candidates].filter((n) => c.values.includes(n)));
    }
  }
  return [...candidates];
}

function suitVarsIn(hand: NMJLHand): SuitVar[] {
  const s = new Set<SuitVar>();
  for (const g of hand.groups) if ('suitVar' in g.tile && g.tile.suitVar) s.add(g.tile.suitVar);
  for (const c of hand.suitConstraints ?? []) for (const v of c.vars) s.add(v);
  return [...s];
}

function numberVarsIn(hand: NMJLHand): NumberVar[] {
  const s = new Set<NumberVar>();
  for (const g of hand.groups) if (g.tile.kind === 'number' && 'numVar' in g.tile) s.add(g.tile.numVar);
  for (const c of hand.numberConstraints ?? []) s.add(c.var);
  return [...s];
}

export type Usefulness = Map<TileKey, number>;

// Precompute how many times each tile identity is required across all hands
// and all their valid bindings. Higher = more useful to hold.
export function computeUsefulness(hands: NMJLHand[]): Usefulness {
  const bag = new Map<TileKey, number>();
  const bump = (k: TileKey) => bag.set(k, (bag.get(k) ?? 0) + 1);
  for (const hand of hands) {
    const suitVars = suitVarsIn(hand);
    const suitBindings = enumerateSuitBindings(suitVars).filter((b) =>
      suitBindingSatisfies(b, hand),
    );
    const numVars = numberVarsIn(hand);
    const nValues = numVars.length > 0 ? nValuesFor(hand) : [null];
    for (const sb of suitBindings) {
      for (const nv of nValues) {
        for (const g of hand.groups) {
          const t = g.tile;
          if (t.kind === 'wind') {
            bump(tileKey({ id: '_x', kind: 'wind', wind: t.wind }));
          } else if (t.kind === 'flower') {
            bump('f');
          } else if (t.kind === 'dragon') {
            if ('color' in t) {
              bump(tileKey({ id: '_x', kind: 'dragon', color: t.color }));
            } else {
              const s = sb[t.suitVar];
              if (!s) continue;
              const color = s === 'bams' ? 'green' : s === 'craks' ? 'red' : 'white';
              bump(tileKey({ id: '_x', kind: 'dragon', color }));
            }
          } else if (t.kind === 'number') {
            if ('suit' in t) {
              bump(tileKey({ id: '_x', kind: 'number', suit: t.suit, rank: t.rank as 1|2|3|4|5|6|7|8|9 }));
              continue;
            }
            const s = sb[t.suitVar];
            if (!s) continue;
            let rank: number;
            if ('rank' in t) rank = t.rank;
            else {
              if (nv == null) continue;
              const off = t.numVar === 'N' ? 0 : parseInt(t.numVar.split('+')[1] ?? '0', 10);
              rank = nv + off;
            }
            if (rank < 1 || rank > 9) continue;
            bump(tileKey({ id: '_x', kind: 'number', suit: s, rank: rank as 1|2|3|4|5|6|7|8|9 }));
          }
        }
      }
    }
  }
  return bag;
}

export function scoreTile(tile: Tile, use: Usefulness): number {
  if (tile.kind === 'joker') return Number.POSITIVE_INFINITY; // never discard a joker
  return use.get(tileKey(tile)) ?? 0;
}

// Rank tiles from LEAST useful to most useful. Ties broken by id for stability.
export function sortRackByUsefulnessAsc(rack: readonly Tile[], use: Usefulness): Tile[] {
  return [...rack].sort((a, b) => {
    const sa = scoreTile(a, use);
    const sb = scoreTile(b, use);
    if (sa !== sb) return sa - sb;
    return a.id.localeCompare(b.id);
  });
}

// Very rough "closeness" score for a rack against a hand: fraction of tile
// slots in the hand that the rack currently satisfies (naturals only).
export function handCloseness(rack: readonly Tile[], hand: NMJLHand): number {
  const totalSlots = hand.groups.reduce((s, g) => s + slotCount(g.kind), 0);
  if (totalSlots === 0) return 0;
  // Try every suit binding and pick the best count.
  const suitVars = suitVarsIn(hand);
  const suitBindings = enumerateSuitBindings(suitVars).filter((b) =>
    suitBindingSatisfies(b, hand),
  );
  const numVars = numberVarsIn(hand);
  const nValues = numVars.length > 0 ? nValuesFor(hand) : [null];
  let best = 0;
  for (const sb of suitBindings) {
    for (const nv of nValues) {
      const identities: TileKey[] = [];
      for (const g of hand.groups) {
        const need = slotCount(g.kind);
        const id = identityFor(g.tile, sb, nv);
        if (!id) continue;
        for (let i = 0; i < need; i++) identities.push(id);
      }
      const remaining = [...rack];
      let hit = 0;
      for (const id of identities) {
        const tpl = tileFromKey(id);
        if (!tpl) continue;
        const idx = remaining.findIndex((t) => t.kind !== 'joker' && tilesEqual(t, tpl));
        if (idx >= 0) {
          remaining.splice(idx, 1);
          hit++;
        }
      }
      if (hit > best) best = hit;
    }
  }
  return best / totalSlots;
}

function slotCount(kind: NMJLHand['groups'][number]['kind']): number {
  return { single: 1, pair: 2, pung: 3, kong: 4, quint: 5, sextet: 6 }[kind];
}

function identityFor(
  tile: NMJLHand['groups'][number]['tile'],
  sb: Partial<Record<SuitVar, Suit>>,
  nv: number | null,
): TileKey | null {
  if (tile.kind === 'wind') return `w:${tile.wind}`;
  if (tile.kind === 'flower') return 'f';
  if (tile.kind === 'dragon') {
    if ('color' in tile) return `d:${tile.color}`;
    const s = sb[tile.suitVar];
    if (!s) return null;
    const color = s === 'bams' ? 'green' : s === 'craks' ? 'red' : 'white';
    return `d:${color}`;
  }
  // number
  if ('suit' in tile) return `n:${tile.suit}:${tile.rank}`;
  const s = sb[tile.suitVar];
  if (!s) return null;
  let rank: number;
  if ('rank' in tile) rank = tile.rank;
  else {
    if (nv == null) return null;
    const off = tile.numVar === 'N' ? 0 : parseInt(tile.numVar.split('+')[1] ?? '0', 10);
    rank = nv + off;
  }
  if (rank < 1 || rank > 9) return null;
  return `n:${s}:${rank}`;
}

// Top N hands by closeness for target-selection heuristics.
export function topHands(
  rack: readonly Tile[],
  hands: NMJLHand[],
  n: number,
): NMJLHand[] {
  return [...hands]
    .map((h) => ({ h, s: handCloseness(rack, h) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.h);
}

// Which tile identities appear in any opponent's exposures — expert bots use
// this to avoid discarding into obvious pungs/kongs.
export function opponentExposureIdentities(
  allExposures: Record<string, Exposure[]>,
  selfSeat: string,
): Set<TileKey> {
  const out = new Set<TileKey>();
  for (const [seat, list] of Object.entries(allExposures)) {
    if (seat === selfSeat) continue;
    for (const ex of list) {
      for (const t of ex.tiles) {
        if (t.kind !== 'joker') out.add(tileKey(t));
      }
    }
  }
  return out;
}

export function tileMatchesKey(tile: Tile, key: TileKey): boolean {
  return tileKey(tile) === key;
}
