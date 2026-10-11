"use client"

import { LocateFixed, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

const COOKIE = "qadr_loc"

function setCookie(lat: number, lng: number) {
  // ~1 km precision; first-party cookie so server-rendered pages can show distances
  document.cookie = `${COOKIE}=${lat.toFixed(2)},${lng.toFixed(2)}; path=/; max-age=${6 * 3600}; samesite=lax`
}
function hasCookie() {
  return document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`))
}

/**
 * Distance is shown only with browser location (SPEC §10.1). Asks only on tap;
 * if permission was already granted earlier, refreshes the position silently.
 */
export function LocationButton({ active, className }: { active: boolean; className?: string }) {
  const t = useTranslations("location")
  const router = useRouter()
  const [state, setState] = useState<"idle" | "busy" | "denied">("idle")

  useEffect(() => {
    if (active || !("permissions" in navigator) || !navigator.geolocation) return
    let cancelled = false
    void navigator.permissions.query({ name: "geolocation" as PermissionName }).then((p) => {
      if (cancelled || p.state !== "granted" || hasCookie()) return
      navigator.geolocation.getCurrentPosition((pos) => {
        setCookie(pos.coords.latitude, pos.coords.longitude)
        router.refresh()
      })
    })
    return () => {
      cancelled = true
    }
  }, [active, router])

  if (active) {
    return (
      <button
        type="button"
        onClick={() => {
          document.cookie = `${COOKIE}=; path=/; max-age=0`
          router.refresh()
        }}
        className={cn("inline-flex h-10 items-center gap-2 rounded-full bg-sage px-4 text-caption font-medium text-forest transition-colors hover:bg-forest hover:text-ivory", className)}
      >
        <LocateFixed className="size-4" aria-hidden="true" />
        {t("on")}
        <X className="size-3.5" aria-label={t("off")} />
      </button>
    )
  }
  return (
    <button
      type="button"
      disabled={state === "busy"}
      onClick={() => {
        if (!navigator.geolocation) return setState("denied")
        setState("busy")
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCookie(pos.coords.latitude, pos.coords.longitude)
            setState("idle")
            router.refresh()
          },
          () => setState("denied"),
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
        )
      }}
      className={cn("inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-caption font-medium text-charcoal transition-colors hover:border-forest/40 hover:text-forest disabled:opacity-60", className)}
    >
      <LocateFixed className={cn("size-4", state === "busy" && "animate-pulse")} aria-hidden="true" />
      {state === "denied" ? t("denied") : t("ask")}
    </button>
  )
}
