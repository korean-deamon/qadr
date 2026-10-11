import type { CSSProperties, ReactNode } from "react"

/**
 * Subtle vertical parallax for imagery using CSS scroll-driven animations
 * (no JavaScript). The wrapper keeps its box, so there is no layout shift;
 * browsers without `animation-timeline` and reduced-motion users get a still image.
 */
export function Parallax({ children, className, distance = 48 }: { children: ReactNode; className?: string; distance?: number }) {
  return (
    <div className={className} style={{ "--parallax-bleed": `${distance}px`, "--parallax-distance": `${distance}px` } as CSSProperties}>
      <div className="parallax-layer absolute inset-x-0 -top-[var(--parallax-bleed)] -bottom-[var(--parallax-bleed)]">{children}</div>
    </div>
  )
}
