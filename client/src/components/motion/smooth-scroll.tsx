"use client"

import type Lenis from "lenis"
import { useEffect } from "react"

/**
 * Lenis smooth scrolling for wheel/trackpad users. Never runs when the user
 * prefers reduced motion, nor on touch devices (native momentum is better and
 * we avoid a permanent requestAnimationFrame loop on phones).
 */
export function SmoothScroll() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)")
    let lenis: Lenis | null = null

    let cancelled = false
    const start = async () => {
      if (query.matches || lenis) return
      const { default: LenisCtor } = await import("lenis")
      if (cancelled || query.matches || lenis) return
      lenis = new LenisCtor({
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
    const onChange = () => (query.matches ? stop() : void start())

    void start()
    query.addEventListener("change", onChange)
    return () => {
      cancelled = true
      query.removeEventListener("change", onChange)
      stop()
    }
  }, [])

  return null
}
