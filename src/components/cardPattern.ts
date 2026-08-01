import type { GroupKind, GroupPattern, TilePattern } from "../game/hands/schema"

// Card suit palette. The card uses only suit *variables* (X/Y/Z), colored like
// the printed NMJL card: X green, Y red, Z navy. Flowers, winds, soap and any
// non-suit-bound dragons are navy; a fixed-color dragon keeps its own color; a
// "matching" dragon (bound to a suit var) follows that suit's color.
export const GREEN = "var(--suit-green)"
export const RED = "var(--suit-red)"
export const NAVY = "var(--tile-navy)"

const GROUP_SIZE: Record<GroupKind, number> = {
  single: 1,
  pair: 2,
  pung: 3,
  kong: 4,
  quint: 5,
  sextet: 6,
}

function suitVarColor(v: "X" | "Y" | "Z"): string {
  return v === "X" ? GREEN : v === "Y" ? RED : NAVY
}

// The display color for a single group's tile.
export function tileColor(tile: TilePattern): string {
  switch (tile.kind) {
    case "flower":
    case "wind":
      return NAVY
    case "dragon":
      if ("suitVar" in tile) return suitVarColor(tile.suitVar)
      if ("color" in tile)
        return tile.color === "green" ? GREEN : tile.color === "red" ? RED : NAVY
      return NAVY // any-dragon (dragonVar)
    case "number":
      if ("suitVar" in tile) return suitVarColor(tile.suitVar)
      return NAVY // fixed-suit variant is unused on this card
  }
}

// Flatten the hand's groups into one color per tile, in order — this lines up
// 1:1 with the non-space characters of the tile pattern.
export function handTileColors(groups: GroupPattern[]): string[] {
  const colors: string[] = []
  for (const g of groups) {
    const c = tileColor(g.tile)
    for (let i = 0; i < GROUP_SIZE[g.kind]; i++) colors.push(c)
  }
  return colors
}

export type ColorRun = { text: string; color: string | null }

// Walk a tile pattern, assigning each character a color: spaces are neutral
// (null), "+"/"=" are navy separators (they don't consume a suit color), and
// every other character is a tile that consumes the next color from `colors`.
// Consecutive same-color characters are merged into one run.
export function patternColorRuns(pattern: string, colors: string[]): ColorRun[] {
  const runs: ColorRun[] = []
  let ti = 0
  const push = (ch: string, color: string | null) => {
    const last = runs[runs.length - 1]
    if (last && last.color === color) last.text += ch
    else runs.push({ text: ch, color })
  }
  for (const ch of pattern) {
    if (ch === " ") push(ch, null)
    else if (ch === "+" || ch === "=") push(ch, NAVY)
    else push(ch, colors[ti++] ?? NAVY)
  }
  return runs
}

// Split a description into the tile pattern and its "(… suits)" note, dropping
// the " — …" explanation half (kept in the JSON, but not shown here).
export function parseHandPattern(description: string): {
  pattern: string
  note: string
} {
  const head = description.split(" — ")[0]!
  const parenIdx = head.indexOf(" (")
  if (parenIdx < 0) return { pattern: head.trim(), note: "" }
  return {
    pattern: head.slice(0, parenIdx).trim(),
    note: head.slice(parenIdx + 1).trim(),
  }
}
