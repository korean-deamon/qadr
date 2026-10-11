"use client"

import { Bell, CalendarDays, Check, MessageCircle, Phone, Star, X } from "lucide-react"
import Image, { type StaticImageData } from "next/image"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { notify as toast } from "@/lib/notify"
import { StatusBadge, type BadgeStatus } from "@/components/borrowing/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { useDates } from "@/lib/i18n/use-dates"
import { tashkentDayDiff, tashkentTime } from "@/lib/i18n/time"
import { cn } from "@/lib/utils"

type Thing = { id: string; title: string; thumb: StaticImageData }
type Person = { name: string; phone?: string }

/* ------------------------------------------------------------------ */

export type IncomingRequestView = { id: string; item: Thing; borrower: Person; start: Date; end: Date; message: string }

export function IncomingRequests({ requests }: { requests: IncomingRequestView[] }) {
  const t = useTranslations()
  const d = useDates()
  const [open, setOpen] = useState(requests)
  const [leaving, setLeaving] = useState<string[]>([])

  const resolve = (r: IncomingRequestView, approved: boolean) => {
    setLeaving((l) => [...l, r.id])
    // let the exit animation play, then drop it from the list
    window.setTimeout(() => setOpen((list) => list.filter((x) => x.id !== r.id)), 340)
    if (approved) toast(t("borrowing.approvedToast", { name: r.borrower.name.split(" ")[0] }))
    else toast(t("borrowing.declinedToast"))
  }

  return (
    <Section title={t("dashboard.sections.incoming")} count={open.length}>
      {open.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-caption text-ink-soft">{t("dashboard.emptyIncoming")}</p>
      ) : (
        <ul className="space-y-3">
            {open.map((r) => (
              <li
                key={r.id}
                className={cn("rounded-2xl border border-line bg-white p-4 md:p-5", leaving.includes(r.id) && "pointer-events-none animate-out-right")}
              >
                <div className="flex gap-4">
                  <Thumb item={r.item} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-2 text-caption font-semibold text-charcoal">
                        <Avatar name={r.borrower.name} size="sm" />
                        {r.borrower.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-meta text-ink-soft">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {d.range(r.start, r.end)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-meta text-ink-soft">{r.item.title}</p>
                    <p className="mt-3 rounded-xl bg-ivory px-3.5 py-2.5 text-caption text-charcoal">“{r.message}”</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => resolve(r, false)}>
                    <X aria-hidden="true" />
                    {t("borrowing.decline")}
                  </Button>
                  <Button size="sm" onClick={() => resolve(r, true)}>
                    <Check aria-hidden="true" />
                    {t("borrowing.approve")}
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </Section>
  )
}

/* ------------------------------------------------------------------ */

export type LoanView = { id: string; item: Thing; other: Person; start: Date; end: Date; status: "approved" | "active" }

function dueStatus(now: Date, l: LoanView): BadgeStatus {
  if (l.status === "approved") return "approved"
  const left = tashkentDayDiff(l.end, now)
  return left < 0 ? "overdue" : left === 0 ? "dueToday" : left === 1 ? "dueTomorrow" : "active"
}

export function LendingLoans({ loans, now }: { loans: LoanView[]; now: Date }) {
  const t = useTranslations()
  const d = useDates()
  const [returned, setReturned] = useState<string[]>([])

  return (
    <Section title={t("dashboard.sections.lending")}>
      <ul className="space-y-3">
        {loans.map((l) => {
          const total = tashkentDayDiff(l.end, l.start) + 1
          const day = Math.min(total, tashkentDayDiff(now, l.start) + 1)
          const done = returned.includes(l.id)
          return (
            <li key={l.id} className="rounded-2xl border border-line bg-white p-4 md:p-5">
              <div className="flex gap-4">
                <Thumb item={l.item} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="truncate text-caption font-semibold text-charcoal">{l.item.title}</p>
                    <StatusBadge status={done ? "returned" : dueStatus(now, l)} />
                  </div>
                  <p className="mt-1 text-meta text-ink-soft">{t("borrowing.borrower", { name: l.other.name })}</p>
                  <div className="mt-4">
                    <div className="flex justify-between text-meta text-ink-soft">
                      <span>{t("borrowing.day", { day, total })}</span>
                      <span>{t("borrowing.until", { date: d.dayMonth(l.end) })}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sage" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={day}>
                      <div className="h-full animate-grow-x rounded-full bg-forest" style={{ width: `${(day / total) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {l.other.phone ? (
                  <Button asChild variant="ghost" size="sm">
                    <a href={`tel:${l.other.phone.replace(/\s/g, "")}`}>
                      <Phone aria-hidden="true" />
                      {t("borrowing.call")}
                    </a>
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={done}
                  onClick={() => {
                    setReturned((r) => [...r, l.id])
                    toast(t("borrowing.returnedToast", { name: l.other.name.split(" ")[0] }))
                  }}
                >
                  <Check aria-hidden="true" />
                  {t("borrowing.markReturned")}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

export function BorrowingLoans({ loans, now }: { loans: LoanView[]; now: Date }) {
  const t = useTranslations()
  const d = useDates()
  return (
    <Section title={t("dashboard.sections.borrowing")}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {loans.map((l) => (
          <li key={l.id} className="flex flex-col rounded-2xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <Thumb item={l.item} />
              <StatusBadge status={dueStatus(now, l)} />
            </div>
            <Link href={`/items/${l.item.id}`} className="mt-3 line-clamp-2 font-display text-[1.1875rem] leading-snug text-charcoal hover:text-forest">
              {l.item.title}
            </Link>
            <p className="mt-1 text-meta text-ink-soft">
              {l.status === "approved"
                ? t("borrowing.pickup", { when: d.dayMonth(l.start) })
                : t("borrowing.until", { date: d.dayMonth(l.end) })}
            </p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-4">
              <span className="flex min-w-0 items-center gap-2 text-meta text-charcoal">
                <Avatar name={l.other.name} size="sm" />
                <span className="truncate">{l.other.name}</span>
              </span>
              {l.other.phone ? (
                <a
                  href={`tel:${l.other.phone.replace(/\s/g, "")}`}
                  aria-label={`${t("borrowing.call")} ${l.other.name}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest text-ivory transition-[background-color,transform] hover:bg-forest-deep active:scale-90"
                >
                  <Phone className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/* ------------------------------------------------------------------ */

export function MyItems({ items }: { items: (Thing & { onLoan: boolean })[] }) {
  const t = useTranslations()
  return (
    <Section title={t("dashboard.sections.items")} action={{ href: "/items/new", label: t("navigation.listItem") }}>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={`/items/${i.id}`} className="flex items-center gap-4 p-3 transition-colors hover:bg-ivory/60">
              <Thumb item={i} small />
              <span className="min-w-0 flex-1 truncate text-caption font-medium text-charcoal">{i.title}</span>
              <span className={cn("rounded-full px-2.5 py-1 text-meta font-medium", i.onLoan ? "bg-sage text-forest" : "bg-ivory text-ink-soft ring-1 ring-line")}>
                {i.onLoan ? t("dashboard.itemStatus.onLoan") : t("dashboard.itemStatus.available")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export type ActivityView = { id: string; type: "requestReceived" | "requestApproved" | "returnDue" | "newMessage" | "ratingReceived"; name: string; item: string; at: Date; read: boolean }

const ACTIVITY_ICON = { requestReceived: CalendarDays, requestApproved: Check, returnDue: Bell, newMessage: MessageCircle, ratingReceived: Star }

export function Activity({ items, now }: { items: ActivityView[]; now: Date }) {
  const t = useTranslations()
  const d = useDates()
  const [read, setRead] = useState(false)
  return (
    <Section title={t("dashboard.sections.activity")} action={{ onClick: () => setRead(true), label: t("notifications.markAllRead") }}>
      <ol className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[1.1rem] before:w-px before:bg-line">
        {items.map((n) => {
          const Icon = ACTIVITY_ICON[n.type]
          const unread = !n.read && !read
          const diff = tashkentDayDiff(now, n.at)
          return (
            <li key={n.id} className="relative flex gap-3 rounded-xl py-2.5 pr-2">
              <span className={cn("relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-ivory transition-colors duration-500", unread ? "bg-forest text-ivory" : "bg-sage text-forest")}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={cn("text-caption", unread ? "font-medium text-charcoal" : "text-ink-soft")}>
                  {t(`notifications.${n.type}`, { name: n.name, item: n.item })}
                </p>
                <p className="text-meta text-ink-soft">
                  {diff === 0 ? tashkentTime(n.at) : diff === 1 ? t("messages.yesterday") : d.dayMonth(n.at)}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </Section>
  )
}

/* ------------------------------------------------------------------ */

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string
  count?: number
  action?: { href?: string; onClick?: () => void; label: string }
  children: React.ReactNode
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

function Thumb({ item, small }: { item: Thing; small?: boolean }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-xl bg-sage", small ? "size-12" : "size-16")}>
      <Image src={item.thumb} alt="" fill sizes="64px" className="object-cover" />
    </span>
  )
}
