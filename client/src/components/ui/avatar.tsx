import { cn } from "@/lib/utils"

const TONES = ["bg-forest text-ivory", "bg-sage text-forest", "bg-ochre text-charcoal", "bg-charcoal text-ivory"]

/** Monogram avatar. Real photos arrive with profiles in Phase 3. */
export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
  const tone = TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length]
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display leading-none font-medium",
        { sm: "size-8 text-[0.8125rem]", md: "size-10 text-[0.9375rem]", lg: "size-14 text-[1.25rem]", xl: "size-20 text-[1.75rem]" }[size],
        tone,
        className,
      )}
    >
      {initials}
    </span>
  )
}
