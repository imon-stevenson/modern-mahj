import { HandsFile } from "./schema"
import type { HandsFile as HandsFileT, NMJLHand } from "./schema"
import raw2025 from "./hands2025.json"
import raw2026 from "./hands2026.json"

export type CardYear = 2025 | 2026
export const CARD_YEARS: readonly CardYear[] = [2025, 2026]

const RAW: Record<CardYear, unknown> = {
  2025: raw2025,
  2026: raw2026,
}

const cache: Partial<Record<CardYear, HandsFileT>> = {}

export function loadHands(year: CardYear): HandsFileT {
  const cached = cache[year]
  if (cached) return cached
  const parsed = HandsFile.safeParse(RAW[year])
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new Error(
      `hands (${year}) failed schema validation at ${issue?.path.join(".") ?? "<root>"}: ${issue?.message ?? "unknown error"}`,
    )
  }
  cache[year] = parsed.data
  return parsed.data
}

export function allHands(year: CardYear): NMJLHand[] {
  return loadHands(year).hands
}

// Test-only helper so tests can bypass the JSON cache with fixture data.
export function __setHandsCache(year: CardYear, data: HandsFileT | null): void {
  if (data) cache[year] = data
  else delete cache[year]
}
