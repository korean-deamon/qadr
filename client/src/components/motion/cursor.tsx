"use client"

import { useEffect, useRef } from "react"
import { useRichPointer } from "@/hooks/use-media-query"

const INTERACTIVE = 'a, button, [role="button"], label, select, summary, [data-cursor]'
const SIZE = { idle: 28, link: 52, magnetic: 76, text: 4, hidden: 0 } as const
type Mode = keyof typeof SIZE

/**
 * A soft follower ring that echoes the native cursor (which stays visible for
 * precision and accessibility). Desktop + motion allowed only. One rAF loop
 * eases position; size and tint change through CSS transitions.
 */
export function Cursor() {
  const rich = useRichPointer()
  if (!rich) return null
  return <Ring />
}

function Ring() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = { x: -100, y: -100 }
    const pos = { x: -100, y: -100 }
    let frame = 0
    let mode: Mode = "hidden"
    const setMode = (m: Mode) => {
      if (m === mode) return
      mode = m
      el.style.setProperty("--size", `${SIZE[m]}px`)
      el.dataset.mode = m
    }
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.24
      pos.y += (target.y - pos.y) * 0.24
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`
      frame = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.3 ? requestAnimationFrame(tick) : 0
    }
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX
      target.y = e.clientY
      if (!frame) frame = requestAnimationFrame(tick)
      const t = e.target as Element | null
      if (t?.closest("input, textarea, [contenteditable]")) return setMode("text")
      const hit = t?.closest(INTERACTIVE)
      setMode(!hit ? "idle" : hit.getAttribute("data-cursor") === "magnetic" ? "magnetic" : "link")
    }
    const onLeave = () => setMode("hidden")
    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return <div ref={ref} aria-hidden="true" data-mode="hidden" className="cursor-ring pointer-events-none fixed top-0 left-0 z-[100] rounded-full border border-forest/50" />
}
