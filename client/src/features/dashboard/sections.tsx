"use client"

import { Bell, CalendarDays, Check, MessageCircle, Package, ShieldAlert, Star, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { createElement, useState, type ReactNode } from "react"
import { useSession } from "@/components/session/session-provider"
import { Thumb } from "@/components/listings/thumb"
import { Avatar } from "@/components/ui/avatar"
import { RequestActions } from "@/features/borrowing/request-actions"
import { Link, useRouter } from "@/i18n/navigation"
import { api } from "@/lib/api/client"
import type { BorrowRequestView, ListingCardData, NotificationItem } from "@/lib/api/types"
import { parseDay } from "@/lib/dates"
import { useDates } from "@/lib/i18n/use-dates"
import { tashkentDayDiff, tashkentTime } from "@/lib/i18n/time"
import { notificationHref, useNotificationText } from "@/lib/notifications"
import { useNow } from "@/lib/use-now"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */

export function RequestItem({ r, onResolved }: { r: BorrowRequestView; onResolved?: (id: string) => void }) {
  const t = useTranslations()
  const d = useDates()
  const [leaving, setLeaving] = useState(false)
  const incoming = r.role === "owner"
  return (
    <li className={cn("rounded-2xl border border-line bg-white p-4 md:p-5", leaving && "pointer-events-none animate-out-right")}>
      <div className="flex gap-4">
        <Link href={`/items/${r.listing.id}`} tabIndex={-1} aria-hidden="true">
          <Thumb src={r.listing.image} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href={`/users/${r.with.id}`} className="flex items-center gap-2 text-caption font-semibold text-charcoal hover:text-forest">
              <Avatar name={r.with.name} size="sm" />
              {r.with.name}
            </Link>
            <span className="flex items-center gap-1.5 text-meta text-ink-soft">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {d.range(parseDay(r.start), parseDay(r.end))}
            </span>
          </div>
          <Link href={`/items/${r.listing.id}`} className="mt-1 block truncate text-meta text-ink-soft hover:text-forest">{r.listing.title}</Link>
          {r.message ? <p className="mt-3 rounded-xl bg-ivory px-3.5 py-2.5 text-caption text-charcoal">“{r.message}”</p> : null}
        </div>
      </div>
      {r.status === "pending" ? (
        <RequestActions
          id={r.id}
          role={incoming ? "owner" : "borrower"}
          name={r.with.name.split(" ")[0]}
          className="mt-4 flex justify-end"
          onDone={() => {
            setLeaving(true)
            window.setTimeout(() => onResolved?.(r.id), 340)
          }}
        />
      ) : null}
      {r.status !== "pending" ? null : incoming ? null : (
        <p className="mt-3 text-meta text-ink-soft">{t("borrowing.waiting", { name: r.with.name.split(" ")[0] })}</p>
      )}
    </li>
  )
}

export function IncomingRequests({ requests }: { requests: BorrowRequestView[] }) {
  const t = useTranslations()
  const [open, setOpen] = useState(requests)
  const [prev, setPrev] = useState(requests)
  if (prev !== requests) {
    setPrev(requests)
    setOpen(requests)
  }
  return (
    <Section title={t("dashboard.sections.incoming")} count={open.length} action={{ href: "/requests", label: t("dashboard.seeAll") }}>
      {open.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-caption text-ink-soft">{t("dashboard.emptyIncoming")}</p>
      ) : (
        <ul className="space-y-3">
          {open.map((r) => (
            <RequestItem key={r.id} r={r} onResolved={(id) => setOpen((l) => l.filter((x) => x.id !== id))} />
          ))}
        </ul>
      )}
    </Section>
  )
}

/* ------------------------------------------------------------------ */

export function MyItems({ items }: { items: ListingCardData[] }) {
  const t = useTranslations()
  return (
    <Section title={t("dashboard.sections.items")} action={{ href: "/items/new", label: t("navigation.listItem") }}>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-caption text-ink-soft">{t("dashboard.emptyItems")}</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {items.slice(0, 6).map((i) => (
            <li key={i.id}>
              <Link href={`/items/${i.id}`} className="flex items-center gap-4 p-3 transition-colors hover:bg-ivory/60">
                <Thumb src={i.image?.url} size="sm" />
                <span className="min-w-0 flex-1 truncate text-caption font-medium text-charcoal">{i.title}</span>
                <ItemStatus item={i} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

export function ItemStatus({ item: i }: { item: ListingCardData }) {
  const t = useTranslations("dashboard.itemStatus")
  const [label, tone] =
    i.status === "hidden_by_admin"
      ? [t("hiddenByAdmin"), "bg-destructive/10 text-destructive"]
      : i.status === "hidden_by_owner"
        ? [t("hidden"), "bg-ivory text-ink-soft ring-1 ring-line"]
        : i.on_loan
          ? [t("onLoan"), "bg-sage text-forest"]
          : i.pending_requests
            ? [t("requests", { count: i.pending_requests }), "bg-ochre/25 text-charcoal"]
            : [t("available"), "bg-ivory text-ink-soft ring-1 ring-line"]
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-meta font-medium", tone)}>{label}</span>
}

/* ------------------------------------------------------------------ */

const ICON: [string, LucideIcon][] = [
  ["request_received", CalendarDays],
  ["request_approved", Check],
  ["loan_picked_up", Package],
  ["return_due", Bell],
  ["rating", Star],
  ["new_message", MessageCircle],
  ["account", ShieldAlert],
  ["moderation", ShieldAlert],
  ["listing_", ShieldAlert],
]
export const notificationIcon = (type: string) => ICON.find(([p]) => type.startsWith(p))?.[1] ?? Bell

export function NotificationRow({ n, now, onOpen }: { n: NotificationItem; now: Date | null; onOpen?: (n: NotificationItem) => void }) {
  const t = useTranslations("messages")
  const d = useDates()
  const text = useNotificationText()
  const unread = !n.read_at
  const at = new Date(n.created_at)
  const diff = now ? tashkentDayDiff(now, at) : null
  const href = notificationHref(n.type)
  const body = (
    <>
      <span className={cn("relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-ivory transition-colors duration-500", unread ? "bg-forest text-ivory" : "bg-sage text-forest")}>
        {createElement(notificationIcon(n.type), { className: "size-4", "aria-hidden": true })}
      </span>
      <span className="min-w-0 pt-0.5">
        <span className={cn("block text-caption", unread ? "font-medium text-charcoal" : "text-ink-soft")}>{text(n.type, n.payload)}</span>
        <span className="block text-meta text-ink-soft" suppressHydrationWarning>
          {diff === null ? "" : diff === 0 ? tashkentTime(at) : diff === 1 ? t("yesterday") : d.dayMonth(at)}
        </span>
      </span>
    </>
  )
  return (
    <li className="relative">
      {href ? (
        <Link href={href} onClick={() => onOpen?.(n)} className="flex gap-3 rounded-xl py-2.5 pr-2 transition-colors hover:bg-white/70">
          {body}
        </Link>
      ) : (
        <button type="button" onClick={() => onOpen?.(n)} className="flex w-full gap-3 rounded-xl py-2.5 pr-2 text-left">
          {body}
        </button>
      )}
    </li>
  )
}

export function Activity({ items: initial }: { items: NotificationItem[] }) {
  const t = useTranslations()
  const router = useRouter()
  const { refreshCounters } = useSession()
  const [items, setItems] = useState(initial)
  const [prev, setPrev] = useState(initial)
  if (prev !== initial) {
    setPrev(initial)
    setItems(initial)
  }
  const now = useNow()
  const stamp = () => new Date().toISOString()

  const readAll = async () => {
    setItems((l) => l.map((n) => ({ ...n, read_at: n.read_at ?? stamp() })))
    try {
      await api("/notifications/read-all", { method: "POST" })
      void refreshCounters()
    } catch {
      router.refresh()
    }
  }
  const open = (n: NotificationItem) => {
    if (n.read_at) return
    setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read_at: stamp() } : x)))
    void api(`/notifications/${n.id}/read`, { method: "POST" }).then(refreshCounters, () => {})
  }

  return (
    <Section
      title={t("dashboard.sections.activity")}
      action={items.some((n) => !n.read_at) ? { onClick: readAll, label: t("notifications.markAllRead") } : { href: "/notifications", label: t("dashboard.seeAll") }}
    >
      {items.length === 0 ? (
        <p className="text-caption text-ink-soft">{t("notifications.emptyBody")}</p>
      ) : (
        <ol className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[1.1rem] before:w-px before:bg-line">
          {items.map((n) => (
            <NotificationRow key={n.id} n={n} now={now} onOpen={open} />
          ))}
        </ol>
      )}
    </Section>
  )
}

/* ------------------------------------------------------------------ */

export function Section({
  title,
  count,
  action,
  children,
}: {
  title: string
  count?: number
  action?: { href?: string; onClick?: () => void; label: string }
  children: ReactNode
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="flex items-baseline gap-2.5 text-[1.625rem] leading-tight text-charcoal">
          {title}
          {count ? <span className="font-sans text-caption font-semibold text-forest tabular-nums">{count}</span> : null}
        </h2>
        {action?.href ? (
          <Link href={action.href} className="shrink-0 text-caption font-medium text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest">
            {action.label}
          </Link>
        ) : action?.onClick ? (
          <button type="button" onClick={action.onClick} className="shrink-0 text-meta font-medium text-forest hover:underline">
            {action.label}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  )
}
