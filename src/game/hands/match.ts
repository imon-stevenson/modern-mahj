import type {
  DragonColor,
  Exposure,
  ExposureKind,
  Suit,
  Tile,
  Wind,
} from '../types';
import { tilesEqual } from '../tiles';
import type {
  DragonVar,
  GroupKind,
  GroupPattern,
  NMJLHand,
  NumberVar,
  SuitVar,
  TilePattern,
  WindVar,
} from './schema';

// A binding maps each variable used by a hand to a concrete value.
type SuitBinding = Partial<Record<SuitVar, Suit>>;
type NumberBinding = { N?: number };
type WindBinding = Partial<Record<WindVar, Wind>>;
type DragonBinding = Partial<Record<DragonVar, DragonColor>>;
type Binding = {
  suits: SuitBinding;
  numbers: NumberBinding;
  winds: WindBinding;
  dragons: DragonBinding;
};

type ConcreteTileIdentity =
  | { kind: 'number'; suit: Suit; rank: number }
  | { kind: 'wind'; wind: Wind }
  | { kind: 'dragon'; color: DragonColor }
  | { kind: 'flower' };

type ConcreteGroup = {
  kind: GroupKind;
  identity: ConcreteTileIdentity;
  jokersAllowed: boolean;
};

const ALL_SUITS: readonly Suit[] = ['bams', 'craks', 'dots'];
const ALL_WINDS: readonly Wind[] = ['N', 'E', 'S', 'W'];
const ALL_DRAGONS: readonly DragonColor[] = ['red', 'green', 'white'];

// ---------- variable enumeration ----------

function suitVarsIn(hand: NMJLHand): SuitVar[] {
  const set = new Set<SuitVar>();
  for (const g of hand.groups) {
    if ('suitVar' in g.tile && g.tile.suitVar) set.add(g.tile.suitVar);
  }
  for (const c of hand.suitConstraints ?? []) {
    for (const v of c.vars) set.add(v);
  }
  return [...set];
}

function numberVarsIn(hand: NMJLHand): NumberVar[] {
  const set = new Set<NumberVar>();
  for (const g of hand.groups) {
    if (g.tile.kind === 'number' && 'numVar' in g.tile) set.add(g.tile.numVar);
  }
  for (const c of hand.numberConstraints ?? []) {
    set.add(c.var);
  }
  return [...set];
}

function windVarsIn(hand: NMJLHand): WindVar[] {
  const set = new Set<WindVar>();
  for (const g of hand.groups) {
    if (g.tile.kind === 'wind' && 'windVar' in g.tile) set.add(g.tile.windVar);
  }
  return [...set];
}

function dragonVarsIn(hand: NMJLHand): DragonVar[] {
  const set = new Set<DragonVar>();
  for (const g of hand.groups) {
    if (g.tile.kind === 'dragon' && 'dragonVar' in g.tile) set.add(g.tile.dragonVar);
  }
  return [...set];
}

function enumerateSuitBindings(vars: SuitVar[]): SuitBinding[] {
  if (vars.length === 0) return [{}];
  const results: SuitBinding[] = [];
  const walk = (i: number, cur: SuitBinding) => {
    if (i === vars.length) {
      results.push({ ...cur });
      return;
    }
    for (const s of ALL_SUITS) {
      cur[vars[i]!] = s;
      walk(i + 1, cur);
    }
  };
  walk(0, {});
  return results;
}

function enumerateWindBindings(vars: WindVar[]): WindBinding[] {
  if (vars.length === 0) return [{}];
  const results: WindBinding[] = [];
  const walk = (i: number, cur: WindBinding) => {
    if (i === vars.length) {
      results.push({ ...cur });
      return;
    }
    for (const w of ALL_WINDS) {
      cur[vars[i]!] = w;
      walk(i + 1, cur);
    }
  };
  walk(0, {});
  return results;
}

function enumerateDragonBindings(vars: DragonVar[]): DragonBinding[] {
  if (vars.length === 0) return [{}];
  const results: DragonBinding[] = [];
  const walk = (i: number, cur: DragonBinding) => {
    if (i === vars.length) {
      results.push({ ...cur });
      return;
    }
    for (const d of ALL_DRAGONS) {
      cur[vars[i]!] = d;
      walk(i + 1, cur);
    }
  };
  walk(0, {});
  return results;
}

function suitBindingSatisfies(binding: SuitBinding, hand: NMJLHand): boolean {
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

function enumerateNumberBindings(vars: NumberVar[], hand: NMJLHand): NumberBinding[] {
  const usesN = vars.length > 0;
  if (!usesN) return [{}];
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
  const maxOffset = vars.reduce((m, v) => {
    if (v === 'N') return m;
    const off = parseInt(v.split('+')[1] ?? '0', 10);
    return Math.max(m, off);
  }, 0);
  candidates = new Set([...candidates].filter((n) => n + maxOffset <= 9));
  return [...candidates].sort((a, b) => a - b).map((n) => ({ N: n }));
}

function resolveNumberVar(varName: NumberVar, binding: NumberBinding): number | null {
  if (binding.N == null) return null;
  if (varName === 'N') return binding.N;
  const off = parseInt(varName.split('+')[1] ?? '0', 10);
  return binding.N + off;
}

function materializeIdentity(
  pattern: TilePattern,
  binding: Binding,
): ConcreteTileIdentity | null {
  if (pattern.kind === 'wind') {
    if ('wind' in pattern) return { kind: 'wind', wind: pattern.wind };
    const w = binding.winds[pattern.windVar];
    if (!w) return null;
    return { kind: 'wind', wind: w };
  }
  if (pattern.kind === 'flower') return { kind: 'flower' };
  if (pattern.kind === 'dragon') {
    if ('color' in pattern) return { kind: 'dragon', color: pattern.color };
    if ('dragonVar' in pattern) {
      const d = binding.dragons[pattern.dragonVar];
      if (!d) return null;
      return { kind: 'dragon', color: d };
    }
    const suit = binding.suits[pattern.suitVar];
    if (!suit) return null;
    const color: DragonColor =
      suit === 'bams' ? 'green' : suit === 'craks' ? 'red' : 'white';
    return { kind: 'dragon', color };
  }
  if ('suit' in pattern) {
    if ('rank' in pattern) return { kind: 'number', suit: pattern.suit, rank: pattern.rank };
    return null;
  }
  const suit = binding.suits[pattern.suitVar];
  if (!suit) return null;
  if ('rank' in pattern) return { kind: 'number', suit, rank: pattern.rank };
  const n = resolveNumberVar(pattern.numVar, binding.numbers);
  if (n == null) return null;
  return { kind: 'number', suit, rank: n };
}

function identityToTile(id: ConcreteTileIdentity): Tile {
  switch (id.kind) {
    case 'number':
      return {
        id: '_tpl',
        kind: 'number',
        suit: id.suit,
        rank: id.rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
      };
    case 'wind':
      return { id: '_tpl', kind: 'wind', wind: id.wind };
    case 'dragon':
      return { id: '_tpl', kind: 'dragon', color: id.color };
    case 'flower':
      return { id: '_tpl', kind: 'flower' };
  }
}

const GROUP_SIZE: Record<GroupKind, number> = {
  single: 1,
  pair: 2,
  pung: 3,
  kong: 4,
  quint: 5,
  sextet: 6,
};

const EXPOSURE_KIND_FOR: Record<GroupKind, ExposureKind | null> = {
  single: null,
  pair: 'pair',
  pung: 'pung',
  kong: 'kong',
  quint: 'quint',
  sextet: 'sextet',
};

function totalTiles(groups: GroupPattern[]): number {
  return groups.reduce((s, g) => s + GROUP_SIZE[g.kind], 0);
}

function materializeGroups(hand: NMJLHand, binding: Binding): ConcreteGroup[] | null {
  const out: ConcreteGroup[] = [];
  for (const g of hand.groups) {
    const id = materializeIdentity(g.tile, binding);
    if (!id) return null;
    out.push({ kind: g.kind, identity: id, jokersAllowed: g.jokersAllowed });
  }
  return out;
}

function exposureSatisfies(ex: Exposure, group: ConcreteGroup): boolean {
  if (ex.kind !== EXPOSURE_KIND_FOR[group.kind]) return false;
  if (ex.tiles.length !== GROUP_SIZE[group.kind]) return false;
  const template = identityToTile(group.identity);
  const jokerCount = ex.jokerIds.length;
  if (jokerCount > 0 && !group.jokersAllowed) return false;
  for (const t of ex.tiles) {
    if (t.kind === 'joker') continue;
    if (!tilesEqual(t, template)) return false;
  }
  return true;
}

function consumeGroupFromRack(rack: Tile[], group: ConcreteGroup): Tile[] | null {
  const template = identityToTile(group.identity);
  const need = GROUP_SIZE[group.kind];
  const naturals: Tile[] = [];
  const jokers: Tile[] = [];
  const rest: Tile[] = [];
  for (const t of rack) {
    if (naturals.length + jokers.length >= need) {
      rest.push(t);
      continue;
    }
    if (t.kind !== 'joker' && tilesEqual(t, template)) {
      naturals.push(t);
    } else if (t.kind === 'joker' && group.jokersAllowed) {
      jokers.push(t);
    } else {
      rest.push(t);
    }
  }
  const total = naturals.length + jokers.length;
  if (total < need) return null;
  const used = [...naturals.slice(0, need)];
  const leftover: Tile[] = [
    ...naturals.slice(need),
    ...jokers.slice(Math.max(0, need - naturals.length)),
  ];
  if (used.length < need) {
    const shortfall = need - used.length;
    used.push(...jokers.slice(0, shortfall));
  }
  return [...rest, ...leftover];
}

export type MatchResult = {
  hand: NMJLHand;
  binding: Binding;
};

export function matchHand(
  rack: Tile[],
  exposures: Exposure[],
  hand: NMJLHand,
): MatchResult | null {
  if (totalTiles(hand.groups) !== 14) return null;
  if (hand.closed && exposures.length > 0) return null;

  const suitBindings = enumerateSuitBindings(suitVarsIn(hand)).filter((b) =>
    suitBindingSatisfies(b, hand),
  );
  const numberBindings = enumerateNumberBindings(numberVarsIn(hand), hand);
  const windBindings = enumerateWindBindings(windVarsIn(hand));
  const dragonBindings = enumerateDragonBindings(dragonVarsIn(hand));

  for (const s of suitBindings) {
    for (const n of numberBindings) {
      for (const w of windBindings) {
        for (const d of dragonBindings) {
          const binding: Binding = { suits: s, numbers: n, winds: w, dragons: d };
          const materialized = materializeGroups(hand, binding);
          if (!materialized) continue;
          const assignment = assignExposures(exposures, materialized);
          if (!assignment) continue;
          const remainingGroups = materialized.filter((_, i) => !assignment.usedGroupIdx.has(i));
          let workingRack = [...rack];
          let ok = true;
          for (const g of remainingGroups) {
            const next = consumeGroupFromRack(workingRack, g);
            if (!next) {
              ok = false;
              break;
            }
            workingRack = next;
          }
          if (!ok) continue;
          if (workingRack.length > 0) continue;
          return { hand, binding };
        }
      }
    }
  }
  return null;
}

function assignExposures(
  exposures: Exposure[],
  groups: ConcreteGroup[],
): { usedGroupIdx: Set<number> } | null {
  const usedGroupIdx = new Set<number>();
  for (const ex of exposures) {
    let matched = -1;
    for (let i = 0; i < groups.length; i++) {
      if (usedGroupIdx.has(i)) continue;
      if (exposureSatisfies(ex, groups[i]!)) {
        matched = i;
        break;
      }
    }
    if (matched < 0) return null;
    usedGroupIdx.add(matched);
  }
  return { usedGroupIdx };
}

export function matchAgainstAll(
  rack: Tile[],
  exposures: Exposure[],
  hands: NMJLHand[],
): MatchResult | null {
  for (const h of hands) {
    const r = matchHand(rack, exposures, h);
    if (r) return r;
  }
  return null;
}
