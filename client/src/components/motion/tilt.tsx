"use client"

import { useRef, type PointerEvent, type ReactNode } from "react"
import { useRichPointer } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

/**
 * Subtle 3D tilt with a soft light glare that follows the pointer.
 * Vanilla pointer events write CSS variables; CSS does the easing. The DOM is
 * identical on every device (no remounts); the effect only engages on
 * desktop with motion allowed.
 */
export function Tilt({ children, className, max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const rich = useRichPointer()
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!rich || !el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty("--rx", `${(0.5 - y) * 2 * max}deg`)
    el.style.setProperty("--ry", `${(x - 0.5) * 2 * max}deg`)
    el.style.setProperty("--gx", `${x * 100}%`)
    el.style.setProperty("--gy", `${y * 100}%`)
    el.dataset.tilting = ""
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty("--rx", "0deg")
    el.style.setProperty("--ry", "0deg")
    delete el.dataset.tilting
  }

  return (
    <div className={cn("h-full [perspective:1100px]", className)}>
      <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className="tilt relative h-full">
        {children}
        <div aria-hidden="true" className="tilt-glare pointer-events-none absolute inset-0 z-20 rounded-2xl mix-blend-soft-light" />
      </div>
    </div>
  )
}
