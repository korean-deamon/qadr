"use client"

import { useRef, type PointerEvent, type ReactNode } from "react"
import { useRichPointer } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

/**
 * Pulls its child gently toward the pointer (desktop + motion allowed).
 * Pointer events set a CSS translate; the spring-like settle is a CSS
 * transition. Same DOM everywhere, so nothing remounts.
 */
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const rich = useRichPointer()
  const ref = useRef<HTMLSpanElement>(null)

  const onMove = (e: PointerEvent<HTMLSpanElement>) => {
    const el = ref.current
    if (!rich || !el) return
    const r = el.getBoundingClientRect()
    el.style.translate = `${(e.clientX - (r.left + r.width / 2)) * strength}px ${(e.clientY - (r.top + r.height / 2)) * strength}px`
  }
  const onLeave = () => {
    if (ref.current) ref.current.style.translate = "0 0"
  }

  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      data-cursor={rich ? "magnetic" : undefined}
      className={cn("magnetic inline-flex", className)}
    >
      {children}
    </span>
  )
}
