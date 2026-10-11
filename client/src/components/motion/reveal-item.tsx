import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** A staggered child of <Reveal stagger>. Plain server markup: no hydration cost. */
export function RevealItem({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  return <Tag className={cn("reveal-item", className)}>{children}</Tag>
}
