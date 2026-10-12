"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter as useNextRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"
import { useSession } from "@/components/session/session-provider"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import type { Me } from "@/lib/api/types"
import { safeNext } from "@/lib/routes"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void
          renderButton(el: HTMLElement, options: Record<string, unknown>): void
        }
      }
    }
  }
}

/** Unlinked accounts finish signing in on the Telegram step (SPEC §11). */
function connectUrl(locale: string, next: string) {
  return `/${locale}/connect-telegram?next=${encodeURIComponent(next)}`
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client"

/**
 * "Continue with Google" — shared by login and register, since both lead to the
 * same place: a session that still needs Telegram linked (SPEC §11). Google only
 * replaces the password, never the verification gate.
 */
export function ContinueWithGoogle({ onError }: { onError: (message: string) => void }) {
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const t = useTranslations("auth")
  const locale = useLocale()
  const next = useSearchParams().get("next")
  const { setMe } = useSession()
  const nav = useNextRouter()
  const apiError = useApiError()
  const elRef = useRef<HTMLDivElement>(null)

  const onCredential = useCallback(
    async ({ credential }: { credential: string }) => {
      onError("")
      try {
        const me = await api<Me>("/auth/google", { json: { credential, locale }, redirectOn401: false, retry: false })
        setMe(me)
        const target = safeNext(next, me.preferred_locale ?? locale)
        nav.replace(me.telegram_required ? connectUrl(me.preferred_locale ?? locale, target) : target)
        nav.refresh()
      } catch (e) {
        onError(apiError(e))
      }
    },
    [locale, next, setMe, nav, apiError, onError],
  )

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false

    const render = () => {
      if (cancelled || !window.google || !elRef.current) return
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential })
      elRef.current.replaceChildren() // re-render cleanly if this effect re-runs
      window.google.accounts.id.renderButton(elRef.current, {
        type: "standard",
        theme: "outline",
        shape: "pill",
        size: "large",
        text: "continue_with",
        logo_alignment: "left",
        locale,
      })
    }

    if (window.google) {
      render()
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
      const script = existing ?? document.createElement("script")
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      script.addEventListener("load", render)
      if (!existing) document.head.appendChild(script)
    }
    return () => {
      cancelled = true
    }
  }, [onCredential, locale, CLIENT_ID])

  if (!CLIENT_ID) return null

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4" role="separator" aria-label={t("orContinueWith")}>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        <span className="text-meta text-ink-soft">{t("orContinueWith")}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </div>
      {/* Google's own widget (an iframe it fully controls) renders inside; only its
          container is ours, so no Tailwind classes reach the button itself. */}
      <div ref={elRef} className="flex justify-center [&>div]:w-full" />
    </div>
  )
}
