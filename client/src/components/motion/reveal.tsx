"use client"

import { motion, useReducedMotion, type Variants } from "motion/react"
import type { ReactNode } from "react"

const EASE = [0.22, 1, 0.36, 1] as const

const group: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}
const child: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

type RevealProps = {
  children: ReactNode
  className?: string
  /** Stagger direct <RevealItem> children instead of revealing as one block */
  stagger?: boolean
  as?: "div" | "section" | "ul" | "ol"
}

/**
 * Scroll reveal: transform + opacity only (compositor-friendly, no layout
 * shift). Renders static content under prefers-reduced-motion.
 */
export function Reveal({ children, className, stagger, as = "div" }: RevealProps) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  if (reduce) {
    const Static = as
    return <Static className={className}>{children}</Static>
  }
  return (
    <Tag
      className={className}
      variants={stagger ? group : child}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
    >
      {children}
    </Tag>
  )
}

export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode
  className?: string
  as?: "div" | "li"
}) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Static = as
    return <Static className={className}>{children}</Static>
  }
  const Tag = motion[as]
  return (
    <Tag className={className} variants={child}>
      {children}
    </Tag>
  )
}
