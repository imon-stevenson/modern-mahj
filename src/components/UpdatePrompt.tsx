import { useRegisterSW } from "virtual:pwa-register/react"

// Service-worker update toast. The plugin is configured with
// registerType: 'prompt', so a new build waits for the player to accept rather
// than reloading mid-hand. Reloading is safe either way—the Zustand `persist`
// middleware restores the game in progress from localStorage.
export function UpdatePrompt(): React.ReactElement | null {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="card-surface fixed bottom-5 right-5 z-[3000] flex items-center gap-4 py-3 pr-3 pl-4 shadow-lg"
    >
      <span className="font-ui text-[13px] font-semibold text-ink">
        A new version is available.
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => void updateServiceWorker(true)}
        >
          Reload
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
      </div>
    </div>
  )
}
