"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api/client"

export type TelegramStatus = {
  enabled: boolean
  linked: boolean
  username: string | null
  phone: string | null
  notifications: boolean
  blocked: boolean
}

const POLL_MS = 3000

/**
 * One-time deep link to the bot, then poll until the bot reports the link
 * (SPEC §22). The poll stops once linked or when the link expires.
 */
export function useTelegramLink(initial: TelegramStatus, onLinked: (status: TelegramStatus) => void) {
  const [status, setStatus] = useState(initial)
  const [link, setLink] = useState<{ url: string; minutes: number } | null>(null)

  useEffect(() => {
    if (!link || status.linked) return
    const started = Date.now()
    const id = window.setInterval(async () => {
      try {
        const s = await api<TelegramStatus>("/telegram/status")
        if (s.linked) {
          window.clearInterval(id)
          setStatus(s)
          setLink(null)
          onLinked(s)
          return
        }
      } catch {}
      if (Date.now() - started > link.minutes * 60_000) setLink(null)
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [link, status.linked, onLinked])

  /** Creates a fresh link and opens Telegram. Call from a click handler (popup rules). */
  const start = useCallback(async () => {
    // Open synchronously so popup blockers allow it, then point it at the bot.
    const tab = window.open("about:blank", "_blank")
    if (tab) tab.opener = null // the bot page must not be able to navigate this tab
    try {
      const res = await api<{ url: string; expires_in: number }>("/telegram/link-token", { method: "POST" })
      setLink({ url: res.url, minutes: Math.round(res.expires_in / 60) })
      if (tab) tab.location.href = res.url
      else window.location.href = res.url // popup blocked (e.g. in-app browsers): go there directly
    } catch (e) {
      tab?.close()
      throw e
    }
  }, [])

  return { status, setStatus, link, start }
}
