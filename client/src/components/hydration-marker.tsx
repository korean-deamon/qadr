"use client"

import { useEffect } from "react"

/** Sets <html data-hydrated> once React has hydrated (used by e2e tests). */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = ""
  }, [])
  return null
}
