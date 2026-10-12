"use client"

import { ExternalLink, Send } from "lucide-react"
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl"
import { useRouter as useNextRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "@/components/session/session-provider"
import { Button } from "@/components/ui/button"
import { refreshSession } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import { notify } from "@/lib/notify"
import { safeNext } from "@/lib/routes"
import { useTelegramLink, type TelegramStatus } from "@/features/settings/use-telegram-link"
import { AuthHeading, FormAlert } from "./fields"

const STEPS = ["open", "share", "back"] as const

/**
 * The gate after sign-up (SPEC §11): a new account can do nothing until it
 * links Telegram, which verifies the phone number. Finishes on its own when
 * the bot reports the link (realtime event or polling).
 */
export function ConnectTelegram({ initial, deleteAt }: { initial: TelegramStatus; deleteAt: string | null }) {
  const t = useTranslations("auth.connect")
  const format = useFormatter()
  const now = useNow({ updateInterval: 60_000 })
  const locale = useLocale()
  const next = useSearchParams().get("next")
  const nav = useNextRouter()
  const apiError = useApiError()
  const { me, refreshMe, logout } = useSession()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const finished = useRef(false)

  const finish = useCallback(async () => {
    if (finished.current) return
    finished.current = true
    await refreshSession() // rotate: the new access token says "linked" to the proxy
    await refreshMe()
    notify(t("done"))
    nav.replace(safeNext(next, locale))
    nav.refresh()
  }, [refreshMe, t, nav, next, locale])

  const { status, link, start } = useTelegramLink(initial, finish)

  // The realtime "telegram.linked" event refreshes `me` before the poll notices.
  useEffect(() => {
    if (me && !me.telegram_required) void finish()
  }, [me, finish])

  const open = async () => {
    setError(undefined)
    setBusy(true)
    try {
      await start()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    await logout()
    // Full navigation: prefetched routes were cached as "redirect to this page"
    // while signed in, and a client-side transition could replay them.
    window.location.replace(`/${locale}`)
  }

  return (
    <>
      <AuthHeading title={t("title")} lead={t("lead")} />

      {!status.enabled ? (
        <p className="rounded-2xl bg-sage px-5 py-4 text-caption text-charcoal">{t("unavailable")}</p>
      ) : (
        <>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-baseline gap-4">
                <span aria-hidden="true" className="w-5 shrink-0 font-display text-[1.5rem] leading-none text-forest">
                  {format.number(i + 1)}
                </span>
                <span className="text-body text-charcoal">{t(`steps.${step}`)}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 space-y-4">
            <FormAlert message={error} />
            {link ? (
              <div className="space-y-3 rounded-2xl bg-sage px-5 py-4" aria-live="polite">
                <p className="flex items-center gap-2.5 text-caption font-medium text-forest">
                  <span className="size-2 shrink-0 animate-pulse rounded-full bg-forest" aria-hidden="true" />
                  {t("waiting")}
                </p>
                <p className="text-meta text-ink-soft">{t("expires", { minutes: link.minutes })}</p>
                <Button asChild variant="outline" size="sm">
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" />
                    {t("openAgain")}
                  </a>
                </Button>
              </div>
            ) : (
              <Button onClick={open} disabled={busy} className="h-12 w-full text-body">
                <Send aria-hidden="true" />
                {t("open")}
              </Button>
            )}
          </div>

          <p className="mt-6 text-meta text-ink-soft">{t("why")}</p>
        </>
      )}

      <div className="mt-10 space-y-3 border-t border-line pt-6 text-meta text-ink-soft">
        {deleteAt ? (
          <p>{t("deleteNotice", { hours: Math.max(1, Math.ceil((new Date(deleteAt).getTime() - now.getTime()) / 3_600_000)) })}</p>
        ) : null}
        <button
          type="button"
          onClick={signOut}
          className="font-medium text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest"
        >
          {t("otherAccount")}
        </button>
      </div>
    </>
  )
}
