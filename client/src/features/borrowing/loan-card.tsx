"use client"

import { Check, Loader2, MessageCircle, Package, Phone, Star, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { StatusBadge, type BadgeStatus } from "@/components/borrowing/status-badge"
import { Thumb } from "@/components/listings/thumb"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ReportDialog } from "@/features/report/report-dialog"
import { Link, useRouter } from "@/i18n/navigation"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import type { LoanView } from "@/lib/api/types"
import { parseDay } from "@/lib/dates"
import { useDates } from "@/lib/i18n/use-dates"
import { notify } from "@/lib/notify"
import { RateDialog } from "./rate-dialog"

const dayDiff = (a: string, b: string) => Math.round((parseDay(a).getTime() - parseDay(b).getTime()) / 86_400_000)

export function loanBadge(l: LoanView, today: string): BadgeStatus {
  if (l.status !== "active") return l.status
  const left = dayDiff(l.end, today)
  return left < 0 ? "overdue" : left === 0 ? "dueToday" : left === 1 ? "dueTomorrow" : "active"
}

/** One loan with every action the viewer may take on it (SPEC §10). */
export function LoanCard({ loan: l, today }: { loan: LoanView; today: string }) {
  const t = useTranslations("borrowing")
  const d = useDates()
  const apiError = useApiError()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const first = l.with.name.split(" ")[0]
  const owner = l.role === "owner"
  const total = dayDiff(l.end, l.start) + 1
  const day = Math.max(0, Math.min(total, dayDiff(today, l.start) + 1))

  const act = async (action: "pickup" | "return" | "cancel", done: string) => {
    if (action === "cancel" && !window.confirm(t("cancelConfirm"))) return
    setBusy(action)
    try {
      await api(`/loans/${l.id}/${action}`, { method: "POST" })
      notify(done)
      router.refresh()
    } catch (err) {
      notify(apiError(err))
    } finally {
      setBusy(null)
    }
  }
  const spin = (a: string) => (busy === a ? <Loader2 className="animate-spin" aria-hidden="true" /> : null)

  return (
    <li className="rounded-2xl border border-line bg-white p-4 md:p-5">
      <div className="flex gap-4">
        <Link href={`/items/${l.listing.id}`} tabIndex={-1} aria-hidden="true">
          <Thumb src={l.listing.image} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link href={`/items/${l.listing.id}`} className="min-w-0 truncate text-caption font-semibold text-charcoal hover:text-forest">
              {l.listing.title}
            </Link>
            <StatusBadge status={loanBadge(l, today)} />
          </div>
          <p className="mt-1 flex items-center gap-2 text-meta text-ink-soft">
            <Avatar name={l.with.name} size="sm" className="size-6 text-[0.625rem]" />
            {owner ? t("borrower", { name: l.with.name }) : t("owner", { name: l.with.name })}
          </p>
          {l.status === "active" ? (
            <div className="mt-4">
              <div className="flex justify-between text-meta text-ink-soft">
                <span>{t("day", { day: Math.max(1, day), total })}</span>
                <span>{t("until", { date: d.dayMonth(parseDay(l.end)) })}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sage" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={day}>
                <div className={l.overdue ? "h-full rounded-full bg-destructive" : "h-full animate-grow-x rounded-full bg-forest"} style={{ width: `${Math.min(100, (day / total) * 100)}%` }} />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-meta text-ink-soft">{d.range(parseDay(l.start), parseDay(l.end))}</p>
          )}
          {l.status === "active" && l.borrower_returned_at && owner ? (
            <p className="mt-3 rounded-xl bg-ochre/15 px-3 py-2 text-meta text-charcoal">{t("borrowerSaysReturned", { name: first })}</p>
          ) : null}
          {l.my_rating ? (
            <p className="mt-2 flex items-center gap-1 text-meta text-ink-soft">
              {t("youRated")}
              <Star className="size-3.5 fill-ochre text-ochre" aria-hidden="true" />
              {l.my_rating}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {l.can_report_not_returned ? (
          <ReportDialog targetType="user" targetId={l.with.id} loanId={l.id} reasons={["not_returned"]} label={t("reportNotReturned")} className="mr-auto" />
        ) : l.status === "returned" ? (
          <ReportDialog targetType="user" targetId={l.with.id} loanId={l.id} reasons={["damaged", "other"]} className="mr-auto" />
        ) : null}
        {l.with.phone ? (
          <Button asChild variant="ghost" size="sm">
            <a href={`tel:${l.with.phone}`}>
              <Phone aria-hidden="true" />
              <span className="hidden sm:inline">{l.with.phone}</span>
              <span className="sm:hidden">{t("call")}</span>
            </a>
          </Button>
        ) : null}
        {l.conversation_id ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/messages/${l.conversation_id}`} aria-label={t("message", { name: first })}>
              <MessageCircle aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        {l.status === "approved" ? (
          <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => act("cancel", t("loanCancelled"))}>
            {spin("cancel") ?? <X aria-hidden="true" />}
            {t("cancel")}
          </Button>
        ) : null}
        {l.status === "approved" && owner ? (
          <Button size="sm" disabled={!!busy} onClick={() => act("pickup", t("pickedUpToast"))}>
            {spin("pickup") ?? <Package aria-hidden="true" />}
            {t("handedOver")}
          </Button>
        ) : null}
        {l.status === "active" && owner ? (
          <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => act("return", t("returnedToast", { name: first }))}>
            {spin("return") ?? <Check aria-hidden="true" />}
            {t("markReturned")}
          </Button>
        ) : null}
        {l.status === "active" && !owner && !l.borrower_returned_at ? (
          <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => act("return", t("returnClaimedToast", { name: first }))}>
            {spin("return") ?? <Check aria-hidden="true" />}
            {t("iReturned")}
          </Button>
        ) : null}
        {l.can_rate ? <RateDialog loanId={l.id} name={first} /> : null}
      </div>
    </li>
  )
}
