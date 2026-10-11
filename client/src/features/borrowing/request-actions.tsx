"use client"

import { Check, Loader2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useSession } from "@/components/session/session-provider"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

/** Approve / decline (owner) or cancel (borrower) a pending request. */
export function RequestActions({
  id,
  role,
  name,
  onDone,
  className,
  size = "sm",
}: {
  id: string
  role: "owner" | "borrower"
  name: string
  onDone?: (status: "approved" | "rejected" | "cancelled") => void
  className?: string
  size?: "sm" | "default"
}) {
  const t = useTranslations("borrowing")
  const apiError = useApiError()
  const router = useRouter()
  const { refreshCounters } = useSession()
  const [busy, setBusy] = useState<string | null>(null)

  const act = async (action: "approve" | "reject" | "cancel") => {
    setBusy(action)
    try {
      await api(`/requests/${id}/${action}`, { method: "POST" })
      const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "cancelled"
      notify(action === "approve" ? t("approvedToast", { name }) : action === "reject" ? t("declinedToast") : t("cancelledToast"))
      onDone?.(status)
      void refreshCounters()
      router.refresh()
    } catch (err) {
      notify(apiError(err))
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (role === "borrower") {
    return (
      <Button variant="ghost" size={size} className={className} disabled={!!busy} onClick={() => act("cancel")}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <X aria-hidden="true" />}
        {t("cancelRequest")}
      </Button>
    )
  }
  return (
    <div className={cn("flex gap-2", className)}>
      <Button size={size} disabled={!!busy} onClick={() => act("approve")}>
        {busy === "approve" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
        {t("approve")}
      </Button>
      <Button variant="outline" size={size} disabled={!!busy} onClick={() => act("reject")}>
        {busy === "reject" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {t("decline")}
      </Button>
    </div>
  )
}
