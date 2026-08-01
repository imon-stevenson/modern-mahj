import { useEffect, useState } from "react"

// Auto-hiding sticky header: hidden while scrolling down, revealed while scrolling
// up, and always shown near the top of the page. Returns whether the header
// should currently be hidden.
export function useAutoHideHeader(): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    let lastY = window.scrollY
    let raf = 0
    const DELTA = 6

    const measure = () => {
      raf = 0
      const y = Math.max(0, window.scrollY)
      const headerH =
        document.getElementById("app-header")?.offsetHeight ?? 72
      if (y <= headerH) {
        setHidden(false)
      } else if (y > lastY + DELTA) {
        setHidden(true) // scrolling down
      } else if (y < lastY - DELTA) {
        setHidden(false) // scrolling up
      }
      lastY = y
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return hidden
}
