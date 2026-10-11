"use client"

import { Eye, EyeOff, Inbox, Loader2, Pencil } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Link, useRouter } from "@/i18n/navigation"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import { notify } from "@/lib/notify"

/** What an owner sees instead of the request form on their own item. */
export function OwnerPanel({ id, status, moderationReason }: { id: string; status: string; moderationReason: string | null }) {
  const t = useTranslations("listings.owner")
  const apiError = useApiError()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const hidden = status === "hidden_by_owner"

  const toggle = async () => {
    setPending(true)
    try {
      await api(`/listings/${id}`, { method: "PATCH", json: { status: hidden ? "active" : "hidden_by_owner" } })
      notify(hidden ? t("shown") : t("hiddenToast"))
      router.refresh()
    } catch (err) {
      notify(apiError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-line bg-white p-6 shadow-soft">
      <h2 className="text-[1.75rem] leading-tight text-charcoal">{t("title")}</h2>
      <p className="mt-2 text-caption text-ink-soft">
        {status === "hidden_by_admin" ? t("hiddenByAdmin", { reason: moderationReason ?? "—" }) : hidden ? t("hiddenNote") : t("liveNote")}
      </p>
      <div className="mt-6 space-y-3">
        <Button asChild size="lg" className="w-full">
          <Link href={`/items/${id}/edit`}>
            <Pencil aria-hidden="true" />
            {t("edit")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/requests">
            <Inbox aria-hidden="true" />
            {t("requests")}
          </Link>
        </Button>
        {status !== "hidden_by_admin" && status !== "removed" ? (
          <Button variant="ghost" size="lg" className="w-full" onClick={toggle} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            {hidden ? t("show") : t("hide")}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
