import type {
  DragonColor,
  Exposure,
  ExposureKind,
  Suit,
  Tile,
  Wind,
} from "../types"
import { tilesEqual } from "../tiles"
import type {
  DragonVar,
  GroupKind,
  GroupPattern,
  NMJLHand,
  NumberVar,
  SuitVar,
  TilePattern,
  WindVar,
} from "./schema"

// A binding maps each variable used by a hand to a concrete value.
type SuitBinding = Partial<Record<SuitVar, Suit>>
type NumberBinding = { N?: number; M?: number }
type WindBinding = Partial<Record<WindVar, Wind>>
type DragonBinding = Partial<Record<DragonVar, DragonColor>>
type Binding = {
  suits: SuitBinding
  numbers: NumberBinding
  winds: WindBinding
  dragons: DragonBinding
}

type ConcreteTileIdentity =
  | { kind: "number"; suit: Suit; rank: number }
  | { kind: "wind"; wind: Wind }
  | { kind: "dragon"; color: DragonColor }
  | { kind: "flower" }

type ConcreteGroup = {
  kind: GroupKind
  identity: ConcreteTileIdentity
  jokersAllowed: boolean
}

const ALL_SUITS: readonly Suit[] = ["bams", "craks", "dots"]
const ALL_WINDS: readonly Wind[] = ["N", "E", "S", "W"]
const ALL_DRAGONS: readonly DragonColor[] = ["red", "green", "white"]

// ---------- variable enumeration ----------

function suitVarsIn(hand: NMJLHand): SuitVar[] {
  const set = new Set<SuitVar>()
  for (const g of hand.groups) {
    if ("suitVar" in g.tile && g.tile.suitVar) set.add(g.tile.suitVar)
  }
  for (const c of hand.suitConstraints ?? []) {
    for (const v of c.vars) set.add(v)
  }
  return [...set]
}

function numberVarsIn(hand: NMJLHand): NumberVar[] {
  const set = new Set<NumberVar>()
  for (const g of hand.groups) {
    if (g.tile.kind === "number" && "numVar" in g.tile) set.add(g.tile.numVar)
  }
  for (const c of hand.numberConstraints ?? []) {
    set.add(c.var)
  }
  return [...set]
}

function windVarsIn(hand: NMJLHand): WindVar[] {
  const set = new Set<WindVar>()
  for (const g of hand.groups) {
    if (g.tile.kind === "wind" && "windVar" in g.tile) set.add(g.tile.windVar)
  }
  return [...set]
}

function dragonVarsIn(hand: NMJLHand): DragonVar[] {
  const set = new Set<DragonVar>()
  for (const g of hand.groups) {
    if (g.tile.kind === "dragon" && "dragonVar" in g.tile)
      set.add(g.tile.dragonVar)
  }
  return [...set]
}

function enumerateSuitBindings(vars: SuitVar[]): SuitBinding[] {
  if (vars.length === 0) return [{}]
  const results: SuitBinding[] = []
  const walk = (i: number, cur: SuitBinding) => {
    if (i === vars.length) {
      results.push({ ...cur })
      return
    }
    for (const s of ALL_SUITS) {
      cur[vars[i]!] = s
      walk(i + 1, cur)
    }
  }
  walk(0, {})
  return results
}

function enumerateWindBindings(vars: WindVar[]): WindBinding[] {
  if (vars.length === 0) return [{}]
  const results: WindBinding[] = []
  const walk = (i: number, cur: WindBinding) => {
    if (i === vars.length) {
      results.push({ ...cur })
      return
    }
    for (const w of ALL_WINDS) {
      cur[vars[i]!] = w
      walk(i + 1, cur)
    }
  }
  walk(0, {})
  return results
}

function enumerateDragonBindings(vars: DragonVar[]): DragonBinding[] {
  if (vars.length === 0) return [{}]
  const results: DragonBinding[] = []
  const walk = (i: number, cur: DragonBinding) => {
    if (i === vars.length) {
      results.push({ ...cur })
      return
    }
    for (const d of ALL_DRAGONS) {
      cur[vars[i]!] = d
      walk(i + 1, cur)
    }
  }
  walk(0, {})
  return results
}

function suitBindingSatisfies(binding: SuitBinding, hand: NMJLHand): boolean {
  for (const c of hand.suitConstraints ?? []) {
    const values = c.vars.map((v) => binding[v]).filter((x): x is Suit => !!x)
    if (values.length < c.vars.length) return true
    if (c.rule === "allDifferent") {
      if (new Set(values).size !== values.length) return false
    } else {
      if (new Set(values).size !== 1) return false
    }
  }
  return true
}

type NumberBase = "N" | "M"

function numberVarBase(v: NumberVar): NumberBase {
  return v.startsWith("M") ? "M" : "N"
}

function numberVarOffset(v: NumberVar): number {
  const plus = v.split("+")[1]
  return plus ? parseInt(plus, 10) : 0
}

// Candidate concrete values for one base (`N` or `M`), honouring its number
// constraints and leaving room for the largest offset used by that base.
function candidatesForBase(
  base: NumberBase,
  vars: NumberVar[],
  hand: NMJLHand,
): number[] {
  let candidates = new Set<number>()
  for (let n = 1; n <= 9; n++) candidates.add(n)
  for (const c of hand.numberConstraints ?? []) {
    if (c.var !== base) continue
    if (c.rule === "range") {
      candidates = new Set(
        [...candidates].filter((n) => n >= c.min && n <= c.max),
      )
    } else {
      candidates = new Set([...candidates].filter((n) => c.values.includes(n)))
    }
  }
  const maxOffset = vars
    .filter((v) => numberVarBase(v) === base)
    .reduce((m, v) => Math.max(m, numberVarOffset(v)), 0)
  candidates = new Set([...candidates].filter((n) => n + maxOffset <= 9))
  return [...candidates].sort((a, b) => a - b)
}

function enumerateNumberBindings(
  vars: NumberVar[],
  hand: NMJLHand,
): NumberBinding[] {
  if (vars.length === 0) return [{}]
  const usesN = vars.some((v) => numberVarBase(v) === "N")
  const usesM = vars.some((v) => numberVarBase(v) === "M")
  const nCands: (number | undefined)[] = usesN
    ? candidatesForBase("N", vars, hand)
    : [undefined]
  const mCands: (number | undefined)[] = usesM
    ? candidatesForBase("M", vars, hand)
    : [undefined]
  const out: NumberBinding[] = []
  for (const n of nCands) {
    for (const m of mCands) {
      // Two independent bases in the same hand denote two different numbers.
      if (usesN && usesM && n === m) continue
      const b: NumberBinding = {}
      if (n !== undefined) b.N = n
      if (m !== undefined) b.M = m
      out.push(b)
    }
  }
  return out
}

function resolveNumberVar(
  varName: NumberVar,
  binding: NumberBinding,
): number | null {
  const base = numberVarBase(varName)
  const baseVal = base === "M" ? binding.M : binding.N
  if (baseVal == null) return null
  return baseVal + numberVarOffset(varName)
}

function materializeIdentity(
  pattern: TilePattern,
  binding: Binding,
): ConcreteTileIdentity | null {
  if (pattern.kind === "wind") {
    if ("wind" in pattern) return { kind: "wind", wind: pattern.wind }
    const w = binding.winds[pattern.windVar]
    if (!w) return null
    return { kind: "wind", wind: w }
  }
  if (pattern.kind === "flower") return { kind: "flower" }
  if (pattern.kind === "dragon") {
    if ("color" in pattern) return { kind: "dragon", color: pattern.color }
    if ("dragonVar" in pattern) {
      const d = binding.dragons[pattern.dragonVar]
      if (!d) return null
      return { kind: "dragon", color: d }
    }
    const suit = binding.suits[pattern.suitVar]
    if (!suit) return null
    const color: DragonColor =
      suit === "bams" ? "green" : suit === "craks" ? "red" : "white"
    return { kind: "dragon", color }
  }
  if ("suit" in pattern) {
    if ("rank" in pattern)
      return { kind: "number", suit: pattern.suit, rank: pattern.rank }
    return null
  }
  const suit = binding.suits[pattern.suitVar]
  if (!suit) return null
  if ("rank" in pattern) return { kind: "number", suit, rank: pattern.rank }
  const n = resolveNumberVar(pattern.numVar, binding.numbers)
  if (n == null) return null
  return { kind: "number", suit, rank: n }
}

function identityToTile(id: ConcreteTileIdentity): Tile {
  switch (id.kind) {
    case "number":
      return {
        id: "_tpl",
        kind: "number",
        suit: id.suit,
        rank: id.rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
      }
    case "wind":
      return { id: "_tpl", kind: "wind", wind: id.wind }
    case "dragon":
      return { id: "_tpl", kind: "dragon", color: id.color }
    case "flower":
      return { id: "_tpl", kind: "flower" }
  }
}

const GROUP_SIZE: Record<GroupKind, number> = {
  single: 1,
  pair: 2,
  pung: 3,
  kong: 4,
  quint: 5,
  sextet: 6,
}

const EXPOSURE_KIND_FOR: Record<GroupKind, ExposureKind | null> = {
  single: null,
  pair: "pair",
  pung: "pung",
  kong: "kong",
  quint: "quint",
  sextet: "sextet",
}

function totalTiles(groups: GroupPattern[]): number {
  return groups.reduce((s, g) => s + GROUP_SIZE[g.kind], 0)
}

function materializeGroups(
  hand: NMJLHand,
  binding: Binding,
): ConcreteGroup[] | null {
  const out: ConcreteGroup[] = []
  for (const g of hand.groups) {
    const id = materializeIdentity(g.tile, binding)
    if (!id) return null
    out.push({ kind: g.kind, identity: id, jokersAllowed: g.jokersAllowed })
  }
  return out
}

function exposureSatisfies(ex: Exposure, group: ConcreteGroup): boolean {
  if (ex.kind !== EXPOSURE_KIND_FOR[group.kind]) return false
  if (ex.tiles.length !== GROUP_SIZE[group.kind]) return false
  const template = identityToTile(group.identity)
  const jokerCount = ex.jokerIds.length
  if (jokerCount > 0 && !group.jokersAllowed) return false
  for (const t of ex.tiles) {
    if (t.kind === "joker") continue
    if (!tilesEqual(t, template)) return false
  }
  return true
}

// Canonical string key for a concrete tile identity, so naturals can be tallied
// and compared by identity. Jokers have no identity (return null).
function identityKey(id: ConcreteTileIdentity): string {
  switch (id.kind) {
    case "number":
      return `n:${id.suit}:${id.rank}`
    case "wind":
      return `w:${id.wind}`
    case "dragon":
      return `d:${id.color}`
    case "flower":
      return "f"
  }
}

function tileIdentityKey(t: Tile): string | null {
  switch (t.kind) {
    case "number":
      return `n:${t.suit}:${t.rank}`
    case "wind":
      return `w:${t.wind}`
    case "dragon":
      return `d:${t.color}`
    case "flower":
      return "f"
    case "joker":
      return null
  }
}

// Exact test: can the concealed `rack` (naturals + jokers) exactly fill every
// group in `groups`—using each rack tile once, no tile left over? This avoids
// the old order-dependent greedy fill by allocating per identity:
//   - naturals of an identity can only serve groups needing that identity,
//   - each natural must be used (surplus ⇒ leftover ⇒ not a completed hand),
//   - non-joker groups (pairs/singles) must be covered by naturals,
//   - jokers (fungible) fill only the remaining joker-allowed slots.
function rackSatisfiesGroups(rack: Tile[], groups: ConcreteGroup[]): boolean {
  const naturals = new Map<string, number>()
  let jokers = 0
  for (const t of rack) {
    const k = tileIdentityKey(t)
    if (k === null) jokers++
    else naturals.set(k, (naturals.get(k) ?? 0) + 1)
  }
  // Demand per identity, split by whether the group can absorb a joker.
  const demandNon = new Map<string, number>()
  const demandJok = new Map<string, number>()
  for (const g of groups) {
    const k = identityKey(g.identity)
    const need = GROUP_SIZE[g.kind]
    const bucket = g.jokersAllowed ? demandJok : demandNon
    bucket.set(k, (bucket.get(k) ?? 0) + need)
  }
  const ids = new Set<string>([
    ...naturals.keys(),
    ...demandNon.keys(),
    ...demandJok.keys(),
  ])
  let jokersNeeded = 0
  for (const k of ids) {
    const avail = naturals.get(k) ?? 0
    const dNon = demandNon.get(k) ?? 0
    const dJok = demandJok.get(k) ?? 0
    const demand = dNon + dJok
    if (avail < dNon) return false // non-joker groups need real tiles
    if (avail > demand) return false // a natural would be left unused
    jokersNeeded += demand - avail
  }
  return jokersNeeded === jokers // every joker used, and enough of them
}

// Try every way to assign each exposure to a distinct compatible group
// (backtracking, not greedy first-match), and return true if any assignment
// leaves the remaining groups satisfying `pred`.
function existsExposureAssignment(
  exposures: Exposure[],
  groups: ConcreteGroup[],
  pred: (unused: ConcreteGroup[]) => boolean,
): boolean {
  const used = new Array<boolean>(groups.length).fill(false)
  const rec = (ei: number): boolean => {
    if (ei === exposures.length) {
      const unused: ConcreteGroup[] = []
      for (let i = 0; i < groups.length; i++)
        if (!used[i]) unused.push(groups[i]!)
      return pred(unused)
    }
    const ex = exposures[ei]!
    for (let i = 0; i < groups.length; i++) {
      if (used[i]) continue
      if (!exposureSatisfies(ex, groups[i]!)) continue
      used[i] = true
      if (rec(ei + 1)) return true
      used[i] = false
    }
    return false
  }
  return rec(0)
}

export type MatchResult = {
  hand: NMJLHand
  binding: Binding
}

export function matchHand(
  rack: Tile[],
  exposures: Exposure[],
  hand: NMJLHand,
): MatchResult | null {
  if (totalTiles(hand.groups) !== 14) return null
  if (hand.closed && exposures.length > 0) return null

  const suitBindings = enumerateSuitBindings(suitVarsIn(hand)).filter((b) =>
    suitBindingSatisfies(b, hand),
  )
  const numberBindings = enumerateNumberBindings(numberVarsIn(hand), hand)
  const windBindings = enumerateWindBindings(windVarsIn(hand))
  const dragonBindings = enumerateDragonBindings(dragonVarsIn(hand))

  for (const s of suitBindings) {
    for (const n of numberBindings) {
      for (const w of windBindings) {
        for (const d of dragonBindings) {
          const binding: Binding = {
            suits: s,
            numbers: n,
            winds: w,
            dragons: d,
          }
          const materialized = materializeGroups(hand, binding)
          if (!materialized) continue
          // Exact: some exposure→group assignment leaves groups the rack can
          // fill precisely (naturals + jokers, every tile used).
          const ok = existsExposureAssignment(
            exposures,
            materialized,
            (unused) => rackSatisfiesGroups(rack, unused),
          )
          if (ok) return { hand, binding }
        }
      }
    }
  }
  return null
}

export function matchAgainstAll(
  rack: Tile[],
  exposures: Exposure[],
  hands: NMJLHand[],
): MatchResult | null {
  for (const h of hands) {
    const r = matchHand(rack, exposures, h)
    if (r) return r
  }
  return null
}

// Greedy count of how many tile slots of `groups` the rack's naturals can fill
// (each natural used once). A partial-progress heuristic, not exact completion.
function rackNaturalFill(rack: Tile[], groups: ConcreteGroup[]): number {
  const naturals = new Map<string, number>()
  for (const t of rack) {
    const k = tileIdentityKey(t)
    if (k !== null) naturals.set(k, (naturals.get(k) ?? 0) + 1)
  }
  let hits = 0
  for (const g of groups) {
    const k = identityKey(g.identity)
    const have = naturals.get(k) ?? 0
    const use = Math.min(GROUP_SIZE[g.kind], have)
    if (use > 0) naturals.set(k, have - use)
    hits += use
  }
  return hits
}

// How close `rack` + `exposures` are to completing `hand`, as a fraction of the
// 14 slots, maximized over the variable bindings and exposure→group assignments
// where the exposures fit. Returns null if the exposures cannot be assigned to
// this hand under any binding—i.e. the hand is no longer reachable. Used by
// bots to choose calls that stay on a real, still-completable line.
export function exposureAwareCloseness(
  rack: Tile[],
  exposures: Exposure[],
  hand: NMJLHand,
): number | null {
  if (totalTiles(hand.groups) !== 14) return null
  if (hand.closed && exposures.length > 0) return null

  const suitBindings = enumerateSuitBindings(suitVarsIn(hand)).filter((b) =>
    suitBindingSatisfies(b, hand),
  )
  const numberBindings = enumerateNumberBindings(numberVarsIn(hand), hand)
  const windBindings = enumerateWindBindings(windVarsIn(hand))
  const dragonBindings = enumerateDragonBindings(dragonVarsIn(hand))

  let best: number | null = null
  for (const s of suitBindings) {
    for (const n of numberBindings) {
      for (const w of windBindings) {
        for (const d of dragonBindings) {
          const binding: Binding = {
            suits: s,
            numbers: n,
            winds: w,
            dragons: d,
          }
          const materialized = materializeGroups(hand, binding)
          if (!materialized) continue
          // Walk every exposure→group assignment (pred returns false so all are
          // explored), scoring exposed slots + rack natural-fill of the rest.
          existsExposureAssignment(exposures, materialized, (unused) => {
            const unusedTiles = unused.reduce(
              (sum, g) => sum + GROUP_SIZE[g.kind],
              0,
            )
            const exposed = 14 - unusedTiles
            const score = (exposed + rackNaturalFill(rack, unused)) / 14
            if (best === null || score > best) best = score
            return false
          })
        }
      }
    }
  }
  return best
}

// Best closeness over all hands, or null if the exposures fit none of them.
export function bestExposureAwareCloseness(
  rack: Tile[],
  exposures: Exposure[],
  hands: NMJLHand[],
): number | null {
  let best: number | null = null
  for (const h of hands) {
    const c = exposureAwareCloseness(rack, exposures, h)
    if (c !== null && (best === null || c > best)) best = c
  }
  return best
}

// The tile identities the player's *best still-reachable* hand (given `rack` +
// `exposures`) still wants—the identity keys (`n:suit:rank` / `w:wind` /
// `d:color` / `f`) of that hand's unexposed groups under the closeness-maximizing
// binding/assignment. Returns null if no hand is reachable. Used by bots to keep
// tiles that advance their committed line instead of only globally-useful ones.
export function targetHandNeeds(
  rack: Tile[],
  exposures: Exposure[],
  hands: NMJLHand[],
): Set<string> | null {
  let bestScore: number | null = null
  let bestNeeds: Set<string> | null = null
  for (const hand of hands) {
    if (totalTiles(hand.groups) !== 14) continue
    if (hand.closed && exposures.length > 0) continue

    const suitBindings = enumerateSuitBindings(suitVarsIn(hand)).filter((b) =>
      suitBindingSatisfies(b, hand),
    )
    const numberBindings = enumerateNumberBindings(numberVarsIn(hand), hand)
    const windBindings = enumerateWindBindings(windVarsIn(hand))
    const dragonBindings = enumerateDragonBindings(dragonVarsIn(hand))

    for (const s of suitBindings) {
      for (const n of numberBindings) {
        for (const w of windBindings) {
          for (const d of dragonBindings) {
            const binding: Binding = {
              suits: s,
              numbers: n,
              winds: w,
              dragons: d,
            }
            const materialized = materializeGroups(hand, binding)
            if (!materialized) continue
            existsExposureAssignment(exposures, materialized, (unused) => {
              const unusedTiles = unused.reduce(
                (sum, g) => sum + GROUP_SIZE[g.kind],
                0,
              )
              const score =
                (14 - unusedTiles + rackNaturalFill(rack, unused)) / 14
              if (bestScore === null || score > bestScore) {
                bestScore = score
                bestNeeds = new Set(unused.map((g) => identityKey(g.identity)))
              }
              return false
            })
          }
        }
      }
    }
  }
  return bestNeeds
}

// Would some hand—still viable given the player's current `exposures`—need a
// `kind` (pung/kong/quint/sextet) of `tile`? Used to gate offering a claim: only
// when a target hand still reachable with the player's exposures actually calls
// for that grouping of the discarded tile (so a player never exposes a group no
// reachable hand can use—which would invalidate their hand).
export function handsAllowGroupingForTile(
  exposures: Exposure[],
  hands: NMJLHand[],
  tile: Tile,
  kind: "pung" | "kong" | "quint" | "sextet",
): boolean {
  for (const hand of hands) {
    const suitBindings = enumerateSuitBindings(suitVarsIn(hand)).filter((b) =>
      suitBindingSatisfies(b, hand),
    )
    const numberBindings = enumerateNumberBindings(numberVarsIn(hand), hand)
    const windBindings = enumerateWindBindings(windVarsIn(hand))
    const dragonBindings = enumerateDragonBindings(dragonVarsIn(hand))

    for (const s of suitBindings) {
      for (const n of numberBindings) {
        for (const w of windBindings) {
          for (const d of dragonBindings) {
            const binding: Binding = {
              suits: s,
              numbers: n,
              winds: w,
              dragons: d,
            }
            const materialized = materializeGroups(hand, binding)
            if (!materialized) continue
            // Some valid exposure assignment must leave an unused group that is
            // a quint/sextet of `tile` (backtracking, so we don't miss it to a
            // greedy first-match that consumed the group for an exposure).
            const found = existsExposureAssignment(
              exposures,
              materialized,
              (unused) =>
                unused.some(
                  (g) =>
                    g.kind === kind &&
                    tilesEqual(identityToTile(g.identity), tile),
                ),
            )
            if (found) return true
          }
        }
      }
    }
  }
  return false
}
