"use client"

import { Heart } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState, type CSSProperties } from "react"
import { useSession } from "@/components/session/session-provider"
import { useRouter } from "@/i18n/navigation"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import { notify as toast } from "@/lib/notify"
import { cn } from "@/lib/utils"

const BURST = Array.from({ length: 7 }, (_, i) => `${(i / 7) * 360}deg`)

/** Save/unsave a listing (POST/DELETE /listings/{id}/save). Visitors are sent to login. */
export function SaveButton({ className, title, listingId, initialSaved = false }: { className?: string; title?: string; listingId: string; initialSaved?: boolean }) {
  const t = useTranslations("listings")
  const locale = useLocale()
  const router = useRouter()
  const apiError = useApiError()
  const { me } = useSession()
  const [saved, setSaved] = useState(initialSaved)
  const [burstKey, setBurstKey] = useState(0)

  const set = async (value: boolean) => {
    setSaved(value) // optimistic
    try {
      await api(`/listings/${listingId}/save`, { method: value ? "POST" : "DELETE" })
    } catch (e) {
      setSaved(!value)
      toast(apiError(e))
    }
  }

  const toggle = () => {
    if (!me) {
      router.push({ pathname: "/login", query: { next: `/${locale}/items/${listingId}` } })
      return
    }
    const next = !saved
    void set(next)
    if (next) {
      setBurstKey((k) => k + 1)
      toast(t("savedToast"), { description: title, action: { label: t("undo"), onClick: () => void set(false) } })
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
