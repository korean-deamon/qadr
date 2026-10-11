"use client"

import { Heart } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, type CSSProperties } from "react"
import { notify as toast } from "@/lib/notify"
import { cn } from "@/lib/utils"

const BURST = Array.from({ length: 7 }, (_, i) => `${(i / 7) * 360}deg`)

/** Local toggle for now; wired to POST/DELETE /listings/{id}/save in Phase 3. */
export function SaveButton({ className, title }: { className?: string; title?: string }) {
  const t = useTranslations("listings")
  const [saved, setSaved] = useState(false)
  const [burstKey, setBurstKey] = useState(0)

  const toggle = () => {
    const next = !saved
    setSaved(next)
    if (next) {
      setBurstKey((k) => k + 1)
      toast(t("savedToast"), { description: title, action: { label: t("undo"), onClick: () => setSaved(false) } })
    }
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? t("saved") : t("save")}
      onClick={toggle}
      className={cn(
        "relative flex size-10 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-soft backdrop-blur transition-[transform,color] duration-200 hover:text-forest active:scale-90",
        className,
      )}
    >
      <span key={saved ? "on" : "off"} className={cn("flex", saved && burstKey > 0 && "animate-pop")}>
        <Heart className={cn("size-[1.125rem] transition-colors duration-200", saved && "fill-forest text-forest")} strokeWidth={1.8} aria-hidden="true" />
      </span>
      {saved && burstKey > 0 ? (
        <span key={burstKey} aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
          {BURST.map((a, i) => (
            <span key={a} className={cn("burst-dot", i % 2 ? "bg-ochre" : "bg-forest")} style={{ "--a": a } as CSSProperties} />
          ))}
        </span>
      ) : null}
    </button>
  )
}
