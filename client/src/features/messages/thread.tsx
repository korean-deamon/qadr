"use client"

import { ArrowLeft, ArrowUp, CheckCircle2, ImageOff, Loader2, Package, Phone, RotateCcw, Send, Trash2, XCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { StatusBadge } from "@/components/borrowing/status-badge"
import { useRealtime, useRealtimeEvent } from "@/components/realtime/realtime-provider"
import { useSession } from "@/components/session/session-provider"
import { Avatar } from "@/components/ui/avatar"
import { MediaImage } from "@/components/ui/media-image"
import { RequestActions } from "@/features/borrowing/request-actions"
import { ReportDialog } from "@/features/report/report-dialog"
import { Link, useRouter } from "@/i18n/navigation"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import type { ApiMessage, ConversationDetail } from "@/lib/api/types"
import { parseDay } from "@/lib/dates"
import { useDates } from "@/lib/i18n/use-dates"
import { tashkentDayDiff, tashkentTime } from "@/lib/i18n/time"
import { notify } from "@/lib/notify"
import { useNow } from "@/lib/use-now"
import { cn } from "@/lib/utils"

const EVENT_ICON: Record<string, typeof Send> = {
  requested: Send,
  approved: CheckCircle2,
  pickedUp: Package,
  returned: RotateCcw,
  rejected: XCircle,
  cancelled: XCircle,
}
const POLL_MS = 10_000

type Local = ApiMessage & { pending?: boolean; failed?: boolean }

export function Thread({ detail, initial, hasMore: initialMore }: { detail: ConversationDetail; initial: ApiMessage[]; hasMore: boolean }) {
  const t = useTranslations("messages")
  const tb = useTranslations("borrowing")
  const d = useDates()
  const apiError = useApiError()
  const router = useRouter()
  const { me, refreshCounters } = useSession()
  const { connected } = useRealtime()
  const [messages, setMessages] = useState<Local[]>(initial)
  const [hasMore, setHasMore] = useState(initialMore)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [draft, setDraft] = useState("")
  const now = useNow()
  const seq = useRef(0)
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const stick = useRef(true)
  const person = detail.with
  const name = person?.name ?? t("deletedUser")
  const closed = detail.listing.status === "removed"

  const markRead = useCallback(async () => {
    try {
      await api(`/conversations/${detail.id}/read`, { method: "POST" })
      void refreshCounters()
    } catch {}
  }, [detail.id, refreshCounters])

  useEffect(() => {
    void markRead()
  }, [markRead])

  const merge = useCallback((incoming: ApiMessage[]) => {
    setMessages((list) => {
      const known = new Set(list.map((m) => m.id))
      const fresh = incoming.filter((m) => !known.has(m.id))
      return fresh.length ? [...list, ...fresh].sort((a, b) => a.created_at.localeCompare(b.created_at)) : list
    })
  }, [])

  useRealtimeEvent((e) => {
    if (e.type !== "message.new" || e.data.conversation_id !== detail.id) return
    merge([e.data.message])
    if (e.data.message.kind === "event") router.refresh() // status changed: reload header
    if (e.data.message.sender_id !== me?.id) void markRead()
  })

  // Fallback while the socket is down: poll the latest page
  useEffect(() => {
    if (connected) return
    const id = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return
      try {
        const page = await api<{ items: ApiMessage[] }>(`/conversations/${detail.id}/messages?limit=20`)
        merge(page.items)
      } catch {}
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [connected, detail.id, merge])

  useEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: messages.length === initial.length ? "auto" : "smooth" })
  }, [messages, initial.length])

  const loadOlder = async () => {
    const first = messages[0]
    if (!first) return
    setLoadingOlder(true)
    stick.current = false
    const el = scroller.current
    const before = el ? el.scrollHeight - el.scrollTop : 0
    try {
      const page = await api<{ items: ApiMessage[]; has_more: boolean }>(
        `/conversations/${detail.id}/messages?before=${encodeURIComponent(first.created_at)}`,
      )
      setMessages((list) => [...page.items, ...list])
      setHasMore(page.has_more)
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - before
      })
    } catch (err) {
      notify(apiError(err))
    } finally {
      setLoadingOlder(false)
    }
  }

  const send = async (body = draft.trim(), retryId?: string) => {
    if (!body) return
    const tempId = retryId ?? `local-${++seq.current}`
    stick.current = true
    setMessages((m) =>
      retryId
        ? m.map((x) => (x.id === retryId ? { ...x, failed: false, pending: true } : x))
        : [...m, { id: tempId, kind: "text", body, sender_id: me?.id ?? null, created_at: new Date().toISOString(), pending: true }],
    )
    if (!retryId) setDraft("")
    input.current?.focus()
    try {
      const saved = await api<ApiMessage>(`/conversations/${detail.id}/messages`, { json: { body } })
      setMessages((m) => {
        const withoutTemp = m.filter((x) => x.id !== tempId)
        return withoutTemp.some((x) => x.id === saved.id) ? withoutTemp : [...withoutTemp, saved]
      })
    } catch (err) {
      setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, pending: false, failed: true } : x)))
      notify(apiError(err))
    }
  }

  const hide = async () => {
    if (!window.confirm(t("deleteConfirm"))) return
    try {
      await api(`/conversations/${detail.id}`, { method: "DELETE" })
      router.replace("/messages")
      router.refresh()
    } catch (err) {
      notify(apiError(err))
    }
  }

  const dayLabel = (at: Date) => {
    if (!now) return d.dayMonth(at)
    const diff = tashkentDayDiff(now, at)
    return diff === 0 ? t("today") : diff === 1 ? t("yesterday") : d.dayMonth(at)
  }

  const req = detail.request
  const badge = detail.loan
    ? detail.loan.status === "approved" ? "approved" : detail.loan.status
    : req?.status

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label={name}>
      <header className="border-b border-line bg-ivory/90 px-[var(--gutter)] py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/messages" aria-label={t("back")} className="-ml-2 flex size-10 items-center justify-center rounded-full text-charcoal hover:bg-sage md:hidden">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          {person ? (
            <Link href={`/users/${person.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={name} />
              <span className="min-w-0">
                <span className="block truncate font-display text-[1.25rem] leading-tight text-charcoal">{name}</span>
                {person.area ? <span className="block text-meta text-ink-soft">{person.area}</span> : null}
              </span>
            </Link>
          ) : (
            <p className="flex-1 font-display text-[1.25rem] text-ink-soft">{name}</p>
          )}
          {person?.phone ? (
            <a
              href={`tel:${person.phone}`}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-caption font-medium text-ivory transition-[background-color,transform] hover:bg-forest-deep active:scale-[0.97]"
            >
              <Phone className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{person.phone}</span>
              <span className="sm:hidden">{tb("call")}</span>
            </a>
          ) : null}
          <button
            type="button"
            onClick={hide}
            aria-label={t("delete")}
            title={t("delete")}
            className="flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sage hover:text-destructive"
          >
            <Trash2 className="size-[1.125rem]" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-white p-2 pr-3">
          <Link href={`/items/${detail.listing.id}`} className="flex min-w-[14rem] flex-1 items-center gap-3">
            <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sage">
              {detail.listing.image ? (
                <MediaImage src={detail.listing.image} alt="" fill sizes="48px" className="object-cover" />
              ) : (
                <ImageOff className="size-4 text-forest/50" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-caption font-medium text-charcoal">{detail.listing.title}</span>
              {req ? <span className="block text-meta text-ink-soft">{d.range(parseDay(req.start), parseDay(req.end))}</span> : null}
            </span>
          </Link>
          {badge ? <StatusBadge status={badge} /> : <span className="text-meta font-medium text-forest">{t("viewItem")}</span>}
          {req?.status === "pending" && person ? (
            <RequestActions id={req.id} role={detail.role} name={person.name.split(" ")[0]} className="w-full justify-end sm:w-auto" />
          ) : null}
          {detail.loan ? (
            <Link href="/borrowings" className="text-meta font-medium text-forest underline-offset-4 hover:underline">{t("manageLoan")}</Link>
          ) : null}
        </div>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="min-h-0 flex-1 overflow-y-auto px-[var(--gutter)] py-6 md:px-8"
        data-lenis-prevent
        role="log"
        aria-live="polite"
      >
        <ol className="mx-auto flex max-w-2xl flex-col gap-1.5">
          {hasMore ? (
            <li className="mb-4 flex justify-center">
              <button type="button" onClick={loadOlder} disabled={loadingOlder} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-meta font-medium text-forest ring-1 ring-line hover:ring-forest/40">
                {loadingOlder ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                {t("older")}
              </button>
            </li>
          ) : null}
          {messages.map((m, i) => {
            const at = new Date(m.created_at)
            const prev = messages[i - 1]
            const newDay = !prev || tashkentDayDiff(at, new Date(prev.created_at)) !== 0
            const next = messages[i + 1]
            const mine = m.sender_id === me?.id
            const lastInGroup = !next || next.kind !== "text" || m.kind !== "text" || next.sender_id !== m.sender_id
            return (
              <Fragment key={m.id}>
                {newDay ? (
                  <li className="my-4 flex items-center gap-3 text-meta text-ink-soft" suppressHydrationWarning>
                    <span className="h-px flex-1 bg-line" />
                    {dayLabel(at)}
                    <span className="h-px flex-1 bg-line" />
                  </li>
                ) : null}
                {m.kind === "event" ? (
                  <EventRow event={m.body} time={tashkentTime(at)} label={m.body in EVENT_ICON ? t(`events.${m.body as "requested"}`) : m.body} />
                ) : (
                  <li className={cn("flex flex-col", mine ? "origin-bottom-right items-end" : "items-start", lastInGroup && "mb-3", m.id.startsWith("local") && "animate-in-up")}>
                    <p
                      className={cn(
                        "max-w-[min(34rem,82%)] rounded-[1.25rem] px-4 py-2.5 text-body leading-snug break-words whitespace-pre-wrap transition-opacity",
                        mine
                          ? "bg-forest text-ivory " + (lastInGroup ? "rounded-br-md" : "")
                          : "border border-line bg-white text-charcoal " + (lastInGroup ? "rounded-bl-md" : ""),
                        m.pending && "opacity-60",
                        m.failed && "bg-destructive/90",
                      )}
                    >
                      {m.body}
                    </p>
                    {m.failed ? (
                      <button type="button" onClick={() => send(m.body, m.id)} className="mt-1 px-1 text-meta font-medium text-destructive underline underline-offset-4">
                        {t("retry")}
                      </button>
                    ) : lastInGroup ? (
                      <span className="mt-1 flex items-center gap-2 px-1 text-meta text-ink-soft">
                        <time className="tabular-nums">{tashkentTime(at)}</time>
                        {!mine && person ? (
                          <ReportDialog targetType="message" targetId={m.id} reasons={["harassment", "spam", "fraud", "inappropriate", "other"]} label={t("report")} className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [li:hover_&]:opacity-100" />
                        ) : null}
                      </span>
                    ) : null}
                  </li>
                )}
              </Fragment>
            )
          })}
        </ol>
      </div>

      {closed || !person ? (
        <p className="border-t border-line bg-ivory px-[var(--gutter)] py-4 text-center text-caption text-ink-soft">{t("closed")}</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
          className="border-t border-line bg-ivory px-[var(--gutter)] py-3 md:px-6"
        >
          <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-[1.5rem] border border-line bg-white p-1.5 pl-4 transition-[border-color,box-shadow] focus-within:border-forest/40 focus-within:shadow-soft">
            <label className="sr-only" htmlFor="composer">{t("placeholder")}</label>
            <textarea
              id="composer"
              ref={input}
              rows={1}
              maxLength={2000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  void send()
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
      )}
    </section>
  )
}

function EventRow({ event, time, label }: { event: string; time: string; label: string }) {
  const Icon = EVENT_ICON[event] ?? CheckCircle2
  const strong = event === "approved"
  return (
    <li className="my-3 flex justify-center">
      <span className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-meta", strong ? "bg-sage font-medium text-forest" : "bg-white text-ink-soft ring-1 ring-line")}>
        <Icon className={cn("size-3.5", strong && "text-forest")} aria-hidden="true" />
        {label}
        <span className="text-ink-soft tabular-nums">{time}</span>
      </span>
    </li>
  )
}
