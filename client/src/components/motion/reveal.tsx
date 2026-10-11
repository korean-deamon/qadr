"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type RevealProps = {
  children: ReactNode
  className?: string
  /** Stagger direct <RevealItem> children instead of revealing as one block */
  stagger?: boolean
  as?: "div" | "section" | "ul" | "ol"
}

/**
 * Scroll reveal with CSS transitions (transform + opacity, no layout shift).
 * Content is server-rendered and only hidden when JS runs and motion is
 * allowed; one IntersectionObserver flips `data-inview`. See `.reveal` in
 * globals.css. Keep it below the fold: never wrap LCP content.
 */
export function Reveal({ children, className, stagger, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.inview = ""
          io.disconnect()
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const Tag = as
  return (
    <Tag ref={ref as React.Ref<never>} className={cn("reveal", className)} data-stagger={stagger ? "" : undefined}>
      {children}
    </Tag>
  )
}
