"use client"

import { Loader2, Star } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { fieldClass, Modal } from "@/components/ui/modal"
import { useRouter } from "@/i18n/navigation"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

export function RateDialog({ loanId, name }: { loanId: string; name: string }) {
  const t = useTranslations("borrowing.rate")
  const apiError = useApiError()
  const router = useRouter()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!score) return setError(t("pick"))
    setPending(true)
    try {
      await api(`/loans/${loanId}/rating`, { json: { score, comment: comment.trim() || null } })
      setOpen(false)
      notify(t("thanks"))
      router.refresh()
    } catch (err) {
      setError(apiError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title={t("title", { name })}
      description={t("lead")}
      trigger={
        <Button size="sm" variant="secondary">
          <Star aria-hidden="true" />
          {t("open")}
        </Button>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset>
          <legend className="sr-only">{t("score")}</legend>
          <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
                <input
                  type="radio"
                  name="score"
                  value={n}
                  checked={score === n}
                  onChange={() => {
                    setScore(n)
                    setError(null)
                  }}
                  className="peer sr-only"
                />
                <span className="sr-only">{t("stars", { n })}</span>
                <Star
                  aria-hidden="true"
                  className={cn(
                    "size-10 transition-[color,fill,transform] duration-200 peer-focus-visible:scale-110 active:scale-90",
                    (hover || score) >= n ? "fill-ochre text-ochre" : "text-line",
                  )}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={id} className="text-caption font-medium text-charcoal">{t("comment")}</label>
          <textarea id={id} rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} className={cn(fieldClass, "mt-2 resize-none")} />
        </div>
        {error ? <p role="alert" className="animate-shake text-caption font-medium text-destructive">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {t("submit")}
        </Button>
      </form>
    </Modal>
  )
}
