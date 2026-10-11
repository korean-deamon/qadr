"use client"

import { useSyncExternalStore } from "react"

const QUERY =
  "(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"

type NavigatorHints = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean; effectiveType?: string }
}

let webgl2: boolean | undefined
function hasWebGL2() {
  if (webgl2 === undefined) {
    try {
      webgl2 = !!document.createElement("canvas").getContext("webgl2")
    } catch {
      webgl2 = false
    }
  }
  return webgl2
}

function capable() {
  if (!window.matchMedia(QUERY).matches) return false
  const nav = navigator as NavigatorHints
  if ((nav.hardwareConcurrency ?? 8) < 4) return false
  if ((nav.deviceMemory ?? 8) < 4) return false
  if (nav.connection?.saveData) return false
  if (/(^|-)2g$/.test(nav.connection?.effectiveType ?? "")) return false
  return hasWebGL2()
}

/**
 * Whether the hero may load its WebGL scene: large fine-pointer screens with
 * motion allowed, enough cores/memory, no data saver, WebGL2. Phones, tablets,
 * low-end machines and reduced motion keep the static image.
 */
export function useCan3D() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(QUERY)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    capable,
    () => false,
  )
}
