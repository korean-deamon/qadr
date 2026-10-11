"use client"

import { useSyncExternalStore } from "react"

/** SSR-safe media query subscription (false on the server). */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Desktop-grade pointer with no reduced-motion preference: gate for cursor, magnetism, tilt. */
export function useRichPointer() {
  return useMediaQuery("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)")
}
