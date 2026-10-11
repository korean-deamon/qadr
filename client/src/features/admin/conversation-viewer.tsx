"use client"

import { Eye, Loader2, Lock } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { fieldClass } from "@/components/ui/modal"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import { useRouter } from "@/i18n/navigation"
import { useDates } from "@/lib/i18n/use-dates"
import { tashkentTime } from "@/lib/i18n/time"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

type Msg = { id: string; kind: "text" | "event"; body: string; sender: string | null; sender_id: string | null; created_at: string }

/** Read-only conversation for a report. Opening it needs a reason and is audited (SPEC §23). */
export function ConversationViewer({ reportId, ownerId }: { reportId: string; ownerId: string | null }) {
  const t = useTranslations("admin.conversation")
  const te = useTranslations("admin.events")
  const apiError = useApiError()
  const id = useId()
  const d = useDates()
  const when = (iso: string) => `${d.dayMonthShort(new Date(iso))} ${tashkentTime(new Date(iso))}`
  const [reason, setReason] = useState("")
  const [messages, setMessages] = useState<Msg[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const open = async (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.trim().length < 3) return setError(t("reasonRequired"))
    setPending(true)
    setError(null)
    try {
      const res = await api<{ messages: Msg[] }>(`/admin/reports/${reportId}/conversation?reason=${encodeURIComponent(reason.trim())}`)
      setMessages(res.messages)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setPending(false)
    }
  }

  if (!messages) {
    return (
      <form onSubmit={open} className="space-y-3">
        <p className="flex items-start gap-2 text-caption text-ink-soft">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("locked")}
        </p>
        <label htmlFor={id} className="sr-only">{t("reason")}</label>
        <input id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} maxLength={500} className={cn(fieldClass, "h-11 py-0")} />
        {error ? <p role="alert" className="text-meta font-medium text-destructive">{error}</p> : null}
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {t("open")}
        </Button>
      </form>
    )
  }
  return (
    <ol className="max-h-[28rem] space-y-2 overflow-y-auto rounded-2xl bg-ivory p-3" data-lenis-prevent aria-label={t("title")}>
      {messages.length === 0 ? <li className="text-caption text-ink-soft">{t("empty")}</li> : null}
      {messages.map((m) =>
        m.kind === "event" ? (
          <li key={m.id} className="text-center text-meta text-ink-soft">
            {te.has(m.body as "requested") ? te(m.body as "requested") : m.body} · {when(m.created_at)}
          </li>
        ) : (
          <li key={m.id} className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-caption", m.sender_id === ownerId ? "ml-auto bg-sage text-charcoal" : "bg-white text-charcoal ring-1 ring-line")}>
            <span className="block text-meta font-semibold text-forest">{m.sender ?? "—"}</span>
            <span className="whitespace-pre-wrap">{m.body}</span>
            <time className="mt-0.5 block text-[0.6875rem] text-ink-soft">{when(m.created_at)}</time>
          </li>
        ),
      )}
    </ol>
  )
}

export function AssignToMe({ reportId, label }: { reportId: string; label: string }) {
  const apiError = useApiError()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        try {
          await api(`/admin/reports/${reportId}/assign`, { json: {} })
          router.refresh()
        } catch (err) {
          notify(apiError(err))
        } finally {
          setPending(false)
        }
      }}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {label}
    </Button>
  )
}
