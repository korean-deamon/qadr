"use client"

import { ArrowLeft, ArrowUp, CheckCircle2, Package, Phone, Send } from "lucide-react"
import Image, { type StaticImageData } from "next/image"
import { useTranslations } from "next-intl"
import { Fragment, useEffect, useRef, useState } from "react"
import { StatusBadge } from "@/components/borrowing/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { Link } from "@/i18n/navigation"
import { useDates } from "@/lib/i18n/use-dates"
import { tashkentDayDiff, tashkentTime } from "@/lib/i18n/time"
import type { Message, RequestStatus } from "@/lib/mock"
import { cn } from "@/lib/utils"

type Props = {
  now: Date
  person: { name: string; area: string; phone: string }
  listing: { id: string; title: string; thumb: StaticImageData }
  status?: RequestStatus
  dates?: [Date, Date]
  messages: Message[]
}

const EVENT_ICON = { requested: Send, approved: CheckCircle2, pickedUp: Package } as const

export function Thread({ now, person, listing, status, dates, messages: initial }: Props) {
  const t = useTranslations("messages")
  const tb = useTranslations("borrowing")
  const d = useDates()
  const [messages, setMessages] = useState(initial)
  const [draft, setDraft] = useState("")
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: messages.length === initial.length ? "auto" : "smooth" })
  }, [messages, initial.length])

  const send = () => {
    const body = draft.trim()
    if (!body) return
    setMessages((m) => [...m, { id: `local-${m.length}`, kind: "text", from: "me", body, at: now }])
    setDraft("")
    input.current?.focus()
  }

  const dayLabel = (at: Date) => {
    const diff = tashkentDayDiff(now, at)
    return diff === 0 ? t("today") : diff === 1 ? t("yesterday") : d.dayMonth(at)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label={person.name}>
      {/* header */}
      <header className="border-b border-line bg-ivory/90 px-[var(--gutter)] py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/messages" aria-label={t("back")} className="-ml-2 flex size-10 items-center justify-center rounded-full text-charcoal hover:bg-sage md:hidden">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <Avatar name={person.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[1.25rem] leading-tight text-charcoal">{person.name}</p>
            <p className="text-meta text-ink-soft">{person.area}</p>
          </div>
          {status === "approved" ? (
            <a
              href={`tel:${person.phone.replace(/\s/g, "")}`}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-caption font-medium text-ivory transition-[background-color,transform] hover:bg-forest-deep active:scale-[0.97]"
            >
              <Phone className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{person.phone}</span>
              <span className="sm:hidden">{tb("call")}</span>
            </a>
          ) : null}
        </div>
        <Link
          href={`/items/${listing.id}`}
          className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-white p-2 pr-4 transition-colors hover:border-forest/30"
        >
          <span className="relative size-12 shrink-0 overflow-hidden rounded-xl">
            <Image src={listing.thumb} alt="" fill sizes="48px" className="object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-caption font-medium text-charcoal">{listing.title}</span>
            {dates ? <span className="block text-meta text-ink-soft">{d.range(dates[0], dates[1])}</span> : null}
          </span>
          {status ? <StatusBadge status={status} className="hidden sm:inline-flex" /> : <span className="text-meta font-medium text-forest">{t("viewItem")}</span>}
        </Link>
      </header>

      {/* messages */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-[var(--gutter)] py-6 md:px-8" data-lenis-prevent role="log" aria-live="polite">
        <ol className="mx-auto flex max-w-2xl flex-col gap-1.5">
          {messages.map((m, i) => {
            const prev = messages[i - 1]
            const newDay = !prev || tashkentDayDiff(m.at, prev.at) !== 0
            const next = messages[i + 1]
            const lastInGroup = !next || next.kind !== "text" || m.kind !== "text" || next.from !== m.from
            return (
              <Fragment key={m.id}>
                {newDay ? (
                  <li className="my-4 flex items-center gap-3 text-meta text-ink-soft">
                    <span className="h-px flex-1 bg-line" />
                    {dayLabel(m.at)}
                    <span className="h-px flex-1 bg-line" />
                  </li>
                ) : null}
                {m.kind === "event" ? (
                  <EventRow event={m.event} time={tashkentTime(m.at)} label={t(`events.${m.event}`)} />
                ) : (
                  <li
                    className={cn(
                      "flex flex-col",
                      m.from === "me" ? "origin-bottom-right items-end" : "items-start",
                      lastInGroup && "mb-3",
                      m.id.startsWith("local") && "animate-in-up",
                    )}
                  >
                    <p
                      className={cn(
                        "max-w-[min(34rem,82%)] rounded-[1.25rem] px-4 py-2.5 text-body leading-snug whitespace-pre-wrap",
                        m.from === "me"
                          ? "bg-forest text-ivory " + (lastInGroup ? "rounded-br-md" : "")
                          : "border border-line bg-white text-charcoal " + (lastInGroup ? "rounded-bl-md" : ""),
                      )}
                    >
                      {m.body}
                    </p>
                    {lastInGroup ? <time className="mt-1 px-1 text-meta text-ink-soft tabular-nums">{tashkentTime(m.at)}</time> : null}
                  </li>
                )}
              </Fragment>
            )
          })}
        </ol>
      </div>

      {/* composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="border-t border-line bg-ivory px-[var(--gutter)] py-3 md:px-6"
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-[1.5rem] border border-line bg-white p-1.5 pl-4 transition-[border-color,box-shadow] focus-within:border-forest/40 focus-within:shadow-soft">
          <label className="sr-only" htmlFor="composer">{t("placeholder")}</label>
          <textarea
            id="composer"
            ref={input}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={t("placeholder")}
            className="max-h-36 min-h-10 flex-1 resize-none bg-transparent py-2 text-body text-charcoal outline-none [field-sizing:content] placeholder:text-ink-soft"
          />
          <button
            type="submit"
            aria-label={t("send")}
            disabled={!draft.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest text-ivory transition-[background-color,color,transform,opacity] duration-300 ease-[var(--ease-qadr)] hover:bg-forest-deep active:scale-90 disabled:scale-[0.85] disabled:bg-sage disabled:text-ink-soft"
          >
            <ArrowUp className="size-5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  )
}

function EventRow({ event, time, label }: { event: keyof typeof EVENT_ICON; time: string; label: string }) {
  const Icon = EVENT_ICON[event]
  return (
    <li className="my-3 flex justify-center">
      <span className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-meta", event === "approved" ? "bg-sage font-medium text-forest" : "bg-white text-ink-soft ring-1 ring-line")}>
        <Icon className={cn("size-3.5", event === "approved" && "text-forest")} aria-hidden="true" />
        {label}
        <span className="text-ink-soft tabular-nums">{time}</span>
      </span>
    </li>
  )
}
