"use client"

import { Loader2, MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { fieldClass, Modal } from "@/components/ui/modal"
import { useSession } from "@/components/session/session-provider"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import { cn } from "@/lib/utils"

/** Opens the existing conversation, or starts one with a first message. */
export function MessageOwner({ listingId, conversationId, ownerName }: { listingId: string; conversationId: string | null; ownerName: string }) {
  const t = useTranslations("listings.request")
  const apiError = useApiError()
  const { me } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (conversationId) {
    return (
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href={`/messages/${conversationId}`}>
          <MessageCircle aria-hidden="true" />
          {t("openChat")}
        </Link>
      </Button>
    )
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setPending(true)
    try {
      const conv = await api<{ id: string }>("/conversations", { json: { listing_id: listingId, body: body.trim() } })
      router.push(`/messages/${conv.id}`)
    } catch (err) {
      setError(apiError(err))
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (o && !me) return router.push({ pathname: "/login", query: { next: pathname } })
        setOpen(o)
      }}
      title={t("messageOwner")}
      description={t("messageLead", { name: ownerName })}
      trigger={
        <Button variant="outline" size="lg" className="w-full">
          <MessageCircle aria-hidden="true" />
          {t("messageOwner")}
        </Button>
      }
    >
      <form onSubmit={send} className="space-y-4">
        <label htmlFor={id} className="sr-only">{t("messageLabel")}</label>
        <textarea
          id={id}
          rows={4}
          autoFocus
          maxLength={2000}
          value={body}
          onChange={(e) => {
            setBody(e.target.value)
            setError(null)
          }}
          placeholder={t("messagePlaceholder")}
          className={cn(fieldClass, "resize-none")}
        />
        {error ? <p role="alert" className="text-caption font-medium text-destructive">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending || !body.trim()}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {t("send")}
        </Button>
      </form>
    </Modal>
  )
}
