import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * Girih / ganch-inspired line lattice: an eight-point khatam star per tile,
 * joined to its neighbours. Pure strokes in currentColor, so callers set tone
 * and opacity. Decorative only.
 */
export function GirihPattern({
  className,
  size = 96,
  strokeWidth = 0.75,
}: {
  className?: string
  size?: number
  strokeWidth?: number
}) {
  const id = useId()
  return (
    <svg aria-hidden="true" focusable="false" className={cn("pointer-events-none", className)}>
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" viewBox="0 0 100 100">
          <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke">
            {/* khatam: two interlaced squares */}
            <path d="M50 20 80 50 50 80 20 50Z" />
            <path d="M28.8 28.8H71.2V71.2H28.8Z" />
            {/* inner octagon */}
            <path d="M41.2 28.8 58.8 28.8 71.2 41.2 71.2 58.8 58.8 71.2 41.2 71.2 28.8 58.8 28.8 41.2Z" opacity=".55" />
            {/* links to neighbouring tiles */}
            <path d="M50 0V20M50 80V100M0 50H20M80 50H100" />
            <path d="M0 0 28.8 28.8M100 0 71.2 28.8M0 100 28.8 71.2M100 100 71.2 71.2" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Pointed Registan-portal arch, used as a clip for imagery. */
export const ARCH_PATH =
  "M0,1 L0,0.36 C0,0.16 0.2,0.05 0.5,0 C0.8,0.05 1,0.16 1,0.36 L1,1 Z"

export function ArchClipDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        <clipPath id="qadr-arch" clipPathUnits="objectBoundingBox">
          <path d={ARCH_PATH} />
        </clipPath>
      </defs>
    </svg>
  )
}

/** Fine outline that traces the arch, drawn just outside the clipped image. */
export function ArchOutline({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute overflow-visible", className)}
    >
      <path d={ARCH_PATH} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * Suzani-inspired rosette in line work: a ring of almond petals around a
 * sun-disc, the way a suzani centrepiece is embroidered. Madder appears only
 * here, as small knots and the centre.
 */
export function SuzaniMedallion({ className }: { className?: string }) {
  const outer = Array.from({ length: 12 }, (_, i) => i * 30)
  const inner = Array.from({ length: 8 }, (_, i) => i * 45)
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={cn("pointer-events-none", className)}>
      <g transform="translate(100 100)" fill="none" strokeLinecap="round">
        <circle r="92" className="stroke-forest/25" strokeWidth="1" />
        <circle r="86" className="stroke-forest/25" strokeWidth="1" strokeDasharray="1 5" />
        {outer.map((d) => (
          <path key={d} d="M0 -38 C14 -52 14 -70 0 -82 C-14 -70 -14 -52 0 -38Z" transform={`rotate(${d})`} className="stroke-ochre" strokeWidth="1.6" />
        ))}
        {outer.map((d) => (
          <path key={`v${d}`} d="M0 -46 V-72" transform={`rotate(${d})`} className="stroke-ochre/60" strokeWidth="1" />
        ))}
        {outer.map((d) => (
          <circle key={`k${d}`} cy="-60" r="2.6" transform={`rotate(${d + 15})`} className="fill-madder" />
        ))}
        <circle r="34" className="stroke-forest" strokeWidth="1.2" />
        {inner.map((d) => (
          <path key={`i${d}`} d="M0 -10 C6 -16 6 -24 0 -30 C-6 -24 -6 -16 0 -10Z" transform={`rotate(${d})`} className="fill-forest" />
        ))}
        <circle r="7" className="fill-madder" />
      </g>
    </svg>
  )
}
