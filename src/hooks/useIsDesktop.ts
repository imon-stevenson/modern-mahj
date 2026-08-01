import { useEffect, useState } from "react"

// True on desktop/laptop: a precise pointer with hover (excludes touch phones and
// tablets). Used to gate keyboard shortcuts and their hints.
const DESKTOP_QUERY = "(hover: hover) and (pointer: fine)"

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false
    return window.matchMedia(DESKTOP_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia(DESKTOP_QUERY)
    const update = () => setIsDesktop(mq.matches)
    update()
    if (mq.addEventListener) mq.addEventListener("change", update)
    else mq.addListener(update)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update)
      else mq.removeListener(update)
    }
  }, [])

  return isDesktop
}
