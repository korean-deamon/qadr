"use client"

import { Flag, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { fieldClass, Modal } from "@/components/ui/modal"
import { useSession } from "@/components/session/session-provider"
import { usePathname, useRouter } from "@/i18n/navigation"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

export type ReportReason = "not_returned" | "damaged" | "no_show" | "fraud" | "inappropriate" | "harassment" | "spam" | "other"

const DEFAULT_REASONS: ReportReason[] = ["fraud", "inappropriate", "spam", "harassment", "other"]

/** Report a listing, user or message (SPEC §15). Loan-related reasons come from the loan itself. */
export function ReportDialog({
  targetType,
  targetId,
  loanId,
  reasons = DEFAULT_REASONS,
  label,
  className,
  onDone,
}: {
  targetType: "listing" | "user" | "message"
  targetId: string
  loanId?: string
  reasons?: ReportReason[]
  label?: string
  className?: string
  onDone?: () => void
}) {
  const t = useTranslations("report")
  const apiError = useApiError()
  const { me } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const ids = { desc: useId(), err: useId() }
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | null>(reasons.length === 1 ? reasons[0] : null)
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return setError(t("pickReason"))
    setPending(true)
    try {
      await api("/reports", {
        json: { target_type: targetType, target_id: targetId, reason, description: description.trim() || null, loan_id: loanId ?? null },
      })
      setOpen(false)
      setDescription("")
      notify(t("sent"), { description: t("sentBody") })
      onDone?.()
    } catch (err) {
      setError(apiError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (o && !me) return router.push({ pathname: "/login", query: { next: pathname } })
        setOpen(o)
        setError(null)
      }}
      title={t("title")}
      description={t("lead")}
      trigger={
        <button type="button" className={cn("inline-flex items-center gap-1.5 text-meta text-ink-soft transition-colors hover:text-destructive", className)}>
          <Flag className="size-3.5" aria-hidden="true" />
          {label ?? t("open")}
        </button>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset>
          <legend className="text-caption font-medium text-charcoal">{t("reason")}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {reasons.map((r) => (
              <label key={r} className="cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => {
                    setReason(r)
                    setError(null)
                  }}
                  className="peer sr-only"
                />
                <span className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-caption text-charcoal transition-colors peer-checked:border-forest peer-checked:bg-forest peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest">
                  {t(`reasons.${r}`)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={ids.desc} className="text-caption font-medium text-charcoal">{t("details")}</label>
          <textarea
            id={ids.desc}
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("detailsPlaceholder")}
            className={cn(fieldClass, "mt-2 resize-none")}
          />
        </div>
        {error ? <p id={ids.err} role="alert" className="animate-shake text-caption font-medium text-destructive">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {t("submit")}
        </Button>
      </form>
    </Modal>
  )
}
