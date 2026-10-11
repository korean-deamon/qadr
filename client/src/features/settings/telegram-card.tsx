"use client"

import { Check, ExternalLink, Phone, Send } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { useSession } from "@/components/session/session-provider"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import { notify } from "@/lib/notify"

type Status = { enabled: boolean; linked: boolean; username: string | null; phone: string | null; notifications: boolean; blocked: boolean }

/** Telegram phone linking (SPEC §22): one-time deep link, then wait for the bot. */
export function TelegramCard({ initial }: { initial: Status }) {
  const t = useTranslations("telegram")
  const apiError = useApiError()
  const { refreshMe } = useSession()
  const [status, setStatus] = useState(initial)
  const [link, setLink] = useState<{ url: string; minutes: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const poll = useRef<number | null>(null)

  useEffect(() => {
    if (!link || status.linked) return
    const started = Date.now()
    poll.current = window.setInterval(async () => {
      try {
        const s = await api<Status>("/telegram/status")
        if (s.linked) {
          setStatus(s)
          setLink(null)
          notify(t("linkedToast"))
          void refreshMe()
        }
      } catch {}
      if (Date.now() - started > link.minutes * 60_000) setLink(null)
    }, 3000)
    return () => {
      if (poll.current) window.clearInterval(poll.current)
    }
  }, [link, status.linked, t, refreshMe])

  const start = async () => {
    setBusy(true)
    try {
      const res = await api<{ url: string; expires_in: number }>("/telegram/link-token", { method: "POST" })
      setLink({ url: res.url, minutes: Math.round(res.expires_in / 60) })
      window.open(res.url, "_blank", "noopener")
    } catch (e) {
      notify(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  const unlink = async () => {
    setBusy(true)
    try {
      await api("/telegram/link", { method: "DELETE" })
      setStatus((s) => ({ ...s, linked: false, username: null, phone: null }))
      notify(t("unlinked"))
      void refreshMe()
    } catch (e) {
      notify(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  const toggleNotifications = async (value: boolean) => {
    setStatus((s) => ({ ...s, notifications: value }))
    try {
      await api("/users/me", { method: "PATCH", json: { telegram_notifications: value } })
    } catch (e) {
      setStatus((s) => ({ ...s, notifications: !value }))
      notify(apiError(e))
    }
  }

  return (
    <section aria-labelledby="tg-title" className="rounded-[1.75rem] border border-line bg-white p-6 md:p-8">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sage text-forest">
          <Send className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="tg-title" className="text-[1.5rem] leading-tight text-charcoal">{t("title")}</h2>
          <p className="mt-2 max-w-[56ch] text-caption text-ink-soft">{t("lead")}</p>
        </div>
      </div>

      {status.linked ? (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-ivory px-5 py-4">
            <span className="flex items-center gap-2 text-caption font-medium text-forest">
              <Check className="size-4" aria-hidden="true" />
              {status.username ? t("linked", { username: `@${status.username}` }) : t("linkedNoUsername")}
            </span>
            {status.phone ? (
              <span className="flex items-center gap-2 text-caption text-charcoal">
                <Phone className="size-4 text-ink-soft" aria-hidden="true" />
                <span className="sr-only">{t("phone")}: </span>
                <span className="tabular-nums">{status.phone}</span>
              </span>
            ) : null}
          </div>
          {status.blocked ? <p className="text-caption text-destructive">{t("blocked")}</p> : null}
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-caption font-medium text-charcoal">{t("notifications")}</span>
              <span className="block text-meta text-ink-soft">{t("notificationsHint")}</span>
            </span>
            <input type="checkbox" checked={status.notifications} onChange={(e) => toggleNotifications(e.target.checked)} className="peer sr-only" />
            <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-forest peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-soft after:transition-transform after:duration-300 peer-checked:after:translate-x-5" />
          </label>
          <Button variant="ghost" size="sm" onClick={unlink} disabled={busy}>{t("unlink")}</Button>
        </div>
      ) : !status.enabled ? (
        <p className="mt-6 rounded-2xl bg-ivory px-5 py-4 text-caption text-ink-soft">{t("unavailable")}</p>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-caption text-charcoal">{t("steps")}</p>
          {link ? (
            <div className="space-y-3 rounded-2xl bg-ivory px-5 py-4" aria-live="polite">
              <p className="flex items-center gap-2 text-caption text-forest">
                <span className="size-2 animate-pulse rounded-full bg-forest" aria-hidden="true" />
                {t("waiting")}
              </p>
              <p className="text-meta text-ink-soft">{t("expires", { minutes: link.minutes })}</p>
              <Button asChild variant="outline" size="sm">
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />
                  {t("open")}
                </a>
              </Button>
            </div>
          ) : (
            <Button onClick={start} disabled={busy}>
              <Send aria-hidden="true" />
              {t("promptAction")}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
