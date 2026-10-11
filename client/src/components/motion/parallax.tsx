"use client"

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react"
import { useRef, type CSSProperties, type ReactNode } from "react"

/**
 * Subtle vertical parallax for imagery. The wrapper keeps its box (no layout
 * shift); only the inner layer translates. Disabled for reduced motion.
 */
export function Parallax({
  children,
  className,
  distance = 48,
}: {
  children: ReactNode
  className?: string
  distance?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [0, distance])

  return (
    <div
      ref={ref}
      className={className}
      style={{ "--parallax-bleed": `${distance}px` } as CSSProperties}
    >
      <motion.div
        style={reduce ? undefined : { y }}
        className="absolute inset-x-0 -top-[var(--parallax-bleed)] -bottom-[var(--parallax-bleed)] will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  )
}
