"use client"

import { Heart } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { cn } from "@/lib/utils"

/** Local toggle for now; wired to POST/DELETE /listings/{id}/save in Phase 3. */
export function SaveButton({ className }: { className?: string }) {
  const t = useTranslations("listings")
  const [saved, setSaved] = useState(false)
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? t("saved") : t("save")}
      onClick={() => setSaved((s) => !s)}
      className={cn(
        "flex size-10 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-soft backdrop-blur transition-[transform,color] duration-200 hover:scale-105 hover:text-forest active:scale-95",
        className,
      )}
    >
      <Heart className={cn("size-[1.125rem] transition-colors", saved && "fill-forest text-forest")} strokeWidth={1.8} aria-hidden="true" />
    </button>
  )
}
