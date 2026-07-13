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
  GroupKind,
  GroupPattern,
  NMJLHand,
  NumberVar,
  SuitVar,
  TilePattern,
} from './schema';

// A binding maps each variable used by a hand to a concrete value.
type SuitBinding = Partial<Record<SuitVar, Suit>>;
type NumberBinding = { N?: number };
type Binding = { suits: SuitBinding; numbers: NumberBinding };

// A concrete (fully-materialized) tile identity a group requires.
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

function suitBindingSatisfies(binding: SuitBinding, hand: NMJLHand): boolean {
  for (const c of hand.suitConstraints ?? []) {
    const values = c.vars.map((v) => binding[v]).filter((x): x is Suit => !!x);
    if (values.length < c.vars.length) return true; // unbound var: not our job
    if (c.rule === 'allDifferent') {
      if (new Set(values).size !== values.length) return false;
    } else {
      if (new Set(values).size !== 1) return false;
    }
  }
  return true;
}

function enumerateNumberBindings(vars: NumberVar[], hand: NMJLHand): NumberBinding[] {
  // Only 'N' is a free variable; N+1, N+2 etc. are derived offsets.
  const usesN = vars.length > 0;
  if (!usesN) return [{}];
  // Find bounds on N from constraints on N. Default: 1..9.
  let candidates = new Set<number>();
  for (let n = 1; n <= 9; n++) candidates.add(n);
  for (const c of hand.numberConstraints ?? []) {
    if (c.var !== 'N') continue;
    if (c.rule === 'range') {
      candidates = new Set(
        [...candidates].filter((n) => n >= c.min && n <= c.max),
      );
    } else {
      candidates = new Set(
        [...candidates].filter((n) => c.values.includes(n)),
      );
    }
  }
  // Also enforce that any N+k referenced stays in 1..9.
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
  if (pattern.kind === 'wind') return { kind: 'wind', wind: pattern.wind };
  if (pattern.kind === 'flower') return { kind: 'flower' };
  if (pattern.kind === 'dragon') {
    if ('color' in pattern) return { kind: 'dragon', color: pattern.color };
    // dragon by suitVar: bams→green, craks→red, dots→white (soap) is a
    // common NMJL convention.
    const suit = binding.suits[pattern.suitVar];
    if (!suit) return null;
    const color: DragonColor =
      suit === 'bams' ? 'green' : suit === 'craks' ? 'red' : 'white';
    return { kind: 'dragon', color };
  }
  // number
  if ('suit' in pattern) {
    // fixed suit
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
  // Manufacture a "template" tile with a fake id — used only for equality
  // checks against real tiles via tilesEqual.
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

// ---------- concrete matching ----------

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

// Does an existing exposure exactly satisfy `group`?
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

// Try to consume rack tiles to form the group. Uses jokers only where the
// group allows them.
function consumeGroupFromRack(
  rack: Tile[],
  group: ConcreteGroup,
): Tile[] | null {
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
  // Keep only what we need; return the leftover naturals/jokers to rest.
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

// ---------- top-level match ----------

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

  const suitVars = suitVarsIn(hand);
  const numVars = numberVarsIn(hand);
  const suitBindings = enumerateSuitBindings(suitVars).filter((b) =>
    suitBindingSatisfies(b, hand),
  );
  const numberBindings = enumerateNumberBindings(numVars, hand);

  for (const s of suitBindings) {
    for (const n of numberBindings) {
      const binding: Binding = { suits: s, numbers: n };
      const materialized = materializeGroups(hand, binding);
      if (!materialized) continue;

      // Try every assignment of existing exposures to distinct groups.
      const assignment = assignExposures(exposures, materialized);
      if (!assignment) continue;

      // The remaining (unassigned) groups must be formed from the rack.
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
      // All 14 tile slots claimed — leftover rack should be empty.
      if (workingRack.length > 0) continue;
      return { hand, binding };
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
