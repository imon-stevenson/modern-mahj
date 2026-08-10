import { create } from "zustand"
import type { Seat } from "../game/types"

// A tiny, non-persisted store for the "what did that bot just do" message that
// flashes on an opponent's card after a call or a joker swap. One message per
// seat, so North's can still be up while South acts. Kept out of game state so
// it never touches gameplay or localStorage.

export const BOT_FLASH_MS = 4000

type Flash = {
  text: string
  // Tiles that changed (a new exposure, or the tile that replaced a joker),
  // highlighted in ExposureRow for as long as the message is up.
  highlightIds: string[]
  // Bumped per flash so the same seat acting twice replays the animation, and
  // so an expiring timer can tell whether it still owns the current message.
  nonce: number
}

type BotFlashState = {
  flashes: Partial<Record<Seat, Flash>>
  // Every live flash's highlight ids, flattened. A joker swap highlights a tile
  // in someone *else's* exposure, so this can't be looked up per seat—and tile
  // ids are unique, so one shared list is unambiguous. Kept as stored state
  // rather than derived in a selector so the reference stays stable.
  highlightIds: string[]
  _show: (seat: Seat, flash: Flash) => void
  _expire: (seat: Seat, nonce: number) => void
  clear: () => void
}

function allHighlights(flashes: Partial<Record<Seat, Flash>>): string[] {
  return Object.values(flashes).flatMap((f) => f?.highlightIds ?? [])
}

export const useBotFlash = create<BotFlashState>((set) => ({
  flashes: {},
  highlightIds: [],
  _show: (seat, flash) =>
    set((s) => {
      const flashes = { ...s.flashes, [seat]: flash }
      return { flashes, highlightIds: allHighlights(flashes) }
    }),
  _expire: (seat, nonce) =>
    set((s) => {
      // Only retire this message if a newer one hasn't replaced it.
      if (s.flashes[seat]?.nonce !== nonce) return s
      const flashes = { ...s.flashes, [seat]: undefined }
      return { flashes, highlightIds: allHighlights(flashes) }
    }),
  clear: () => set({ flashes: {}, highlightIds: [] }),
}))

let seq = 0

// Flash a message on a seat's card for BOT_FLASH_MS. No-op outside the browser
// so the store actions that call this stay side-effect-free under Vitest.
export function flashBotAction(
  seat: Seat,
  text: string,
  highlightIds: string[] = [],
): void {
  if (typeof window === "undefined") return
  const nonce = ++seq
  useBotFlash.getState()._show(seat, { text, highlightIds, nonce })
  window.setTimeout(
    () => useBotFlash.getState()._expire(seat, nonce),
    BOT_FLASH_MS,
  )
}

export function clearBotFlashes(): void {
  useBotFlash.getState().clear()
}
