"use client"

import Lenis from "lenis"
import { useEffect } from "react"

/** Lenis smooth scrolling; never runs when the user prefers reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    let lenis: Lenis | null = null

    const start = () => {
      if (query.matches || lenis) return
      lenis = new Lenis({
        autoRaf: true,
        lerp: 0.11,
        anchors: { offset: -80 },
        stopInertiaOnNavigate: true,
      })
    }
    const stop = () => {
      lenis?.destroy()
      lenis = null
    }
    const onChange = () => (query.matches ? stop() : start())

    start()
    query.addEventListener("change", onChange)
    return () => {
      query.removeEventListener("change", onChange)
      stop()
    }
  }, [])

  return null
}
