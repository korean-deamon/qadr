"use client"

import { BellOff, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useRealtimeEvent } from "@/components/realtime/realtime-provider"
import { useSession } from "@/components/session/session-provider"
import { Button } from "@/components/ui/button"
import { NotificationRow } from "@/features/dashboard/sections"
import { api } from "@/lib/api/client"
import type { NotificationItem } from "@/lib/api/types"
import { useNow } from "@/lib/use-now"

const PAGE = 30

export function NotificationsList({ initial, unread: initialUnread }: { initial: NotificationItem[]; unread: number }) {
  const t = useTranslations("notifications")
  const { refreshCounters } = useSession()
  const [items, setItems] = useState(initial)
  const [unread, setUnread] = useState(initialUnread)
  const [more, setMore] = useState(initial.length === PAGE)
  const [loading, setLoading] = useState(false)
  const now = useNow()

  useRealtimeEvent((e) => {
    if (e.type !== "notification.new") return
    setItems((l) => (l.some((n) => n.id === e.data.id) ? l : [{ ...e.data, read_at: null, created_at: new Date().toISOString() }, ...l]))
    setUnread((u) => u + 1)
  })

  const stamp = () => new Date().toISOString()
  const readAll = async () => {
    setItems((l) => l.map((n) => ({ ...n, read_at: n.read_at ?? stamp() })))
    setUnread(0)
    await api("/notifications/read-all", { method: "POST" }).catch(() => {})
    void refreshCounters()
  }
  const open = (n: NotificationItem) => {
    if (n.read_at) return
    setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read_at: stamp() } : x)))
    setUnread((u) => Math.max(0, u - 1))
    void api(`/notifications/${n.id}/read`, { method: "POST" }).then(refreshCounters, () => {})
  }
  const loadMore = async () => {
    const last = items.at(-1)
    if (!last) return
    setLoading(true)
    try {
      const page = await api<{ items: NotificationItem[] }>(`/notifications?limit=${PAGE}&before=${encodeURIComponent(last.created_at)}`)
      setItems((l) => [...l, ...page.items])
      setMore(page.items.length === PAGE)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-line px-6 py-14 text-center">
        <BellOff className="size-9 text-forest/40" aria-hidden="true" />
        <p className="mt-4 font-display text-[1.5rem] text-charcoal">{t("empty")}</p>
        <p className="mt-2 max-w-[40ch] text-caption text-ink-soft">{t("emptyBody")}</p>
      </div>
    )
  }
  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-caption text-ink-soft" aria-live="polite">{unread ? t("unreadCount", { count: unread }) : t("allRead")}</p>
        {unread ? (
          <Button variant="ghost" size="sm" onClick={readAll}>{t("markAllRead")}</Button>
        ) : null}
      </div>
      <ol className="relative space-y-1 rounded-[1.75rem] border border-line bg-white/60 p-3 before:absolute before:top-6 before:bottom-6 before:left-[1.85rem] before:w-px before:bg-line md:p-4 md:before:left-[2.1rem]">
        {items.map((n) => <NotificationRow key={n.id} n={n} now={now} onOpen={open} />)}
      </ol>
      {more ? (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t("loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
