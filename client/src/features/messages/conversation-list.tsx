"use client"

import { ImageOff, MessagesSquare, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useRealtimeEvent } from "@/components/realtime/realtime-provider"
import { useSession } from "@/components/session/session-provider"
import { Avatar } from "@/components/ui/avatar"
import { MediaImage } from "@/components/ui/media-image"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import type { ConversationSummary } from "@/lib/api/types"
import { useDates } from "@/lib/i18n/use-dates"
import { tashkentDayDiff, tashkentTime } from "@/lib/i18n/time"
import { useNow } from "@/lib/use-now"
import { cn } from "@/lib/utils"

export function ConversationList({ items: initial }: { items: ConversationSummary[] }) {
  const t = useTranslations("messages")
  const d = useDates()
  const { me } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [q, setQ] = useState("")
  const now = useNow()
  const threadOpen = pathname.startsWith("/messages/")
  const openId = threadOpen ? pathname.split("/")[2] : null

  // new server data, or a newly opened thread (opening reads it)
  const [prev, setPrev] = useState({ initial, openId })
  if (prev.initial !== initial || prev.openId !== openId) {
    setPrev({ initial, openId })
    const base = prev.initial !== initial ? initial : items
    setItems(openId ? base.map((c) => (c.id === openId ? { ...c, unread: 0 } : c)) : base)
  }

  useRealtimeEvent((e) => {
    if (e.type !== "message.new") return
    const { conversation_id: id, message } = e.data
    setItems((list) => {
      const c = list.find((x) => x.id === id)
      if (!c) {
        router.refresh() // a brand-new conversation: let the server build its summary
        return list
      }
      const unread = id === openId || message.sender_id === me?.id || message.kind !== "text" ? c.unread : c.unread + 1
      return [{ ...c, last_message: message, unread, updated_at: message.created_at }, ...list.filter((x) => x.id !== id)]
    })
  })

  const when = (iso: string) => {
    if (!now) return ""
    const at = new Date(iso)
    const diff = tashkentDayDiff(now, at)
    return diff === 0 ? tashkentTime(at) : diff === 1 ? t("yesterday") : d.dayMonthShort(at)
  }
  const preview = (c: ConversationSummary) => {
    const m = c.last_message
    if (!m) return ""
    return m.kind === "event" ? t(`events.${m.body as "requested"}`) : m.body
  }
  const shown = items.filter((c) => `${c.with?.name ?? ""} ${c.listing.title}`.toLocaleLowerCase().includes(q.toLocaleLowerCase()))

  return (
    <aside className={cn("flex min-h-0 flex-col border-line md:border-r", threadOpen && "hidden md:flex")}>
      <div className="px-[var(--gutter)] pt-6 pb-4 md:px-5">
        <h1 className="text-title text-charcoal md:text-section">{t("title")}</h1>
        {items.length ? (
          <label className="mt-4 flex items-center gap-2.5 rounded-full border border-line bg-white px-4 py-2.5 focus-within:border-forest/40">
            <Search className="size-4 text-ink-soft" aria-hidden="true" />
            <span className="sr-only">{t("search")}</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search")}
              className="w-full bg-transparent text-caption text-charcoal outline-none placeholder:text-ink-soft"
            />
          </label>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center md:hidden">
          <MessagesSquare className="size-10 text-forest/40" aria-hidden="true" />
          <p className="mt-4 font-display text-[1.5rem] text-charcoal">{t("none")}</p>
          <p className="mt-2 max-w-[30ch] text-caption text-ink-soft">{t("emptyBody")}</p>
        </div>
      ) : null}
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 md:px-3" data-lenis-prevent>
        {shown.map((c) => {
          const active = c.id === openId
          const unread = active ? 0 : c.unread
          const name = c.with?.name ?? t("deletedUser")
          const fromMe = c.last_message?.kind === "text" && c.last_message.sender_id === me?.id
          return (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex gap-3 rounded-2xl px-3 py-3.5 transition-colors duration-200",
                  active ? "bg-white shadow-soft" : "hover:bg-white/70",
                )}
              >
                <span className="relative">
                  <Avatar name={name} />
                  <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center overflow-hidden rounded-md bg-sage ring-2 ring-ivory">
                    {c.listing.image ? (
                      <MediaImage src={c.listing.image} alt="" fill sizes="24px" className="object-cover" />
                    ) : (
                      <ImageOff className="size-3 text-forest/50" aria-hidden="true" />
                    )}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-caption text-charcoal", unread ? "font-semibold" : "font-medium")}>{name}</span>
                    <span suppressHydrationWarning className={cn("shrink-0 text-meta", unread ? "font-semibold text-forest" : "text-ink-soft")}>
                      {when(c.updated_at)}
                    </span>
                  </span>
                  <span className="block truncate text-meta text-ink-soft">{c.listing.title}</span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className={cn("truncate text-caption", unread ? "text-charcoal" : "text-ink-soft")}>
                      {fromMe ? <span className="text-ink-soft">{t("you")} </span> : null}
                      {preview(c)}
                    </span>
                    {unread ? (
                      <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-forest text-[0.6875rem] font-semibold text-ivory">
                        {unread}
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
