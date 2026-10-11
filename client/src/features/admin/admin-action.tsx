"use client"

import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState, type ReactNode } from "react"
import { useSession } from "@/components/session/session-provider"
import { Button } from "@/components/ui/button"
import { fieldClass, Modal } from "@/components/ui/modal"
import { usePathname, useRouter } from "@/i18n/navigation"
import { api, ApiError } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

type Variant = "default" | "outline" | "ghost" | "secondary" | "destructive"

/**
 * A moderation action: asks for the required reason (and days for a
 * restriction), POSTs it, refreshes. Stale admin sessions are sent to log in again.
 */
export function AdminAction({
  endpoint,
  label,
  title,
  description,
  confirm,
  variant = "outline",
  extra,
  field = "reason",
  done,
  reportId,
  icon,
  size = "sm",
}: {
  endpoint: string
  label: string
  title: string
  description?: string
  confirm: string
  variant?: Variant
  extra?: "days" | "to"
  field?: "reason" | "body" | "text"
  done: string
  reportId?: string
  icon?: ReactNode
  size?: "sm" | "default"
}) {
  const t = useTranslations("admin.action")
  const apiError = useApiError()
  const router = useRouter()
  const pathname = usePathname()
  const { logout } = useSession()
  const ids = { text: useId(), days: useId() }
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [days, setDays] = useState(7)
  const [to, setTo] = useState<"reporter" | "target" | "both">("both")
  const [error, setError] = useState<string | null>(null)
  const [reauth, setReauth] = useState(false)
  const [pending, setPending] = useState(false)
  const min = field === "body" ? 1 : 3

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim().length < min) return setError(t("reasonRequired"))
    setPending(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { [field]: text.trim() }
      if (reportId) body.report_id = reportId
      if (extra === "days") body.days = days
      if (extra === "to") body.to = to
      await api(endpoint, { json: body })
      setOpen(false)
      setText("")
      notify(done)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.code === "REAUTH_REQUIRED") setReauth(true)
      setError(apiError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        setError(null)
      }}
      title={title}
      description={description}
      trigger={
        <Button variant={variant} size={size}>
          {icon}
          {label}
        </Button>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {extra === "to" ? (
          <fieldset>
            <legend className="text-caption font-medium text-charcoal">{t("to")}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["both", "reporter", "target"] as const).map((x) => (
                <label key={x} className="cursor-pointer">
                  <input type="radio" name="to" checked={to === x} onChange={() => setTo(x)} className="peer sr-only" />
                  <span className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-caption text-charcoal transition-colors peer-checked:border-forest peer-checked:bg-forest peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-forest">
                    {t(`recipients.${x}`)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        {extra === "days" ? (
          <div>
            <label htmlFor={ids.days} className="text-caption font-medium text-charcoal">{t("days")}</label>
            <input
              id={ids.days}
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
              className={cn(fieldClass, "mt-2 h-12 w-32 py-0")}
            />
          </div>
        ) : null}
        <div>
          <label htmlFor={ids.text} className="text-caption font-medium text-charcoal">{t(field === "reason" ? "reason" : "message")}</label>
          <textarea
            id={ids.text}
            rows={4}
            maxLength={field === "body" ? 4000 : 1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={field === "reason" ? t("reasonPlaceholder") : undefined}
            className={cn(fieldClass, "mt-2 resize-none")}
          />
          {field === "reason" ? <p className="mt-1.5 text-meta text-ink-soft">{t("reasonHint")}</p> : null}
        </div>
        {error ? (
          <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-caption font-medium text-destructive">
            {error}
            {reauth ? (
              <button
                type="button"
                onClick={async () => {
                  await logout()
                  router.replace({ pathname: "/login", query: { next: pathname } })
                }}
                className="mt-2 block font-semibold underline underline-offset-4"
              >
                {t("relogin")}
              </button>
            ) : null}
          </div>
        ) : null}
        <Button type="submit" size="lg" className={cn("w-full", variant === "destructive" && "bg-destructive text-white hover:bg-destructive/90")} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {confirm}
        </Button>
      </form>
    </Modal>
  )
}
