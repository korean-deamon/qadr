"use client"

import { Check, Loader2, MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useDates } from "@/lib/i18n/use-dates"
import { useId, useState } from "react"
import { notify as toast } from "@/lib/notify"
import { Magnetic } from "@/components/motion/magnetic"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { BookingCalendar, type Range } from "./booking-calendar"

type Props = {
  today: Date
  booked: [Date, Date][]
  maxDays: number
  ownerName: string
  terms: string[]
}

export function RequestPanel({ today, booked, maxDays, ownerName, terms }: Props) {
  const t = useTranslations("listings.request")
  const tv = useTranslations("validation")
  const dates = useDates()
  const ids = { msg: useId(), terms: useId(), err: useId() }
  const [range, setRange] = useState<Range>({ start: null, end: null })
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")

  const days = range.start && range.end ? Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1 : 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!range.start || !range.end) return setError(tv("dates"))
    if (!accepted) return setError(tv("terms"))
    setError(null)
    setState("sending")
    window.setTimeout(() => {
      setState("sent")
      toast(t("sentTitle"), { description: t("sentBody", { name: ownerName }) })
    }, 900)
  }

  return (
    <div id="request" className="scroll-mt-28 rounded-[1.75rem] border border-line bg-white p-6 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[1.75rem] leading-tight text-charcoal">{t("title")}</h2>
        <span className="rounded-full bg-sage px-3 py-1 text-meta font-semibold text-forest">{t("free")}</span>
      </div>
      <p className="mt-1 text-meta text-ink-soft">{t("maxNote", { days: maxDays })}</p>

      {state === "sent" ? (
          <div className="mt-8 flex animate-in-up flex-col items-center py-6 text-center" role="status">
            <span className="flex size-16 animate-pop items-center justify-center rounded-full bg-forest text-ivory">
              <Check className="size-7" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <p className="mt-5 font-display text-[1.5rem] text-charcoal">{t("sentTitle")}</p>
            <p className="mt-2 max-w-[28ch] text-caption text-ink-soft">{t("sentBody", { name: ownerName })}</p>
            {range.start && range.end ? (
              <p className="mt-4 rounded-full bg-sage px-4 py-1.5 text-meta font-medium text-forest">
                {dates.range(range.start, range.end)}
              </p>
            ) : null}
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 space-y-6">
            <BookingCalendar
              today={today}
              booked={booked}
              maxDays={maxDays}
              value={range}
              onChange={(r) => {
                setRange(r)
                setError(null)
              }}
              onTooLong={() => setError(t("tooLong", { days: maxDays }))}
            />

            <div className="flex min-h-12 items-center justify-between rounded-2xl bg-ivory px-4 py-3 text-caption" aria-live="polite">
              {range.start ? (
                <>
                  <span className="font-medium text-charcoal">
                    {range.end
                      ? dates.range(range.start, range.end)
                      : dates.dayMonthShort(range.start)}
                  </span>
                  <span className="text-ink-soft">{range.end ? t("nights", { days }) : t("selectEnd")}</span>
                </>
              ) : (
                <span className="text-ink-soft">{t("selectStart")}</span>
              )}
            </div>

            <div>
              <label htmlFor={ids.msg} className="text-caption font-medium text-charcoal">{t("messageLabel")}</label>
              <textarea
                id={ids.msg}
                rows={3}
                placeholder={t("messagePlaceholder")}
                className="mt-2 w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-body text-charcoal transition-[border-color,box-shadow] placeholder:text-ink-soft focus:border-forest/50 focus:shadow-soft focus:outline-none"
              />
            </div>

            {terms.length ? (
              <ul className="space-y-1.5 text-caption text-ink-soft">
                {terms.map((term) => (
                  <li key={term} className="flex gap-2"><span aria-hidden="true" className="mt-[0.6em] size-1 shrink-0 rounded-full bg-ochre" />{term}</li>
                ))}
              </ul>
            ) : null}

            <label htmlFor={ids.terms} className="flex cursor-pointer items-center gap-3 text-caption text-charcoal">
              <input
                id={ids.terms}
                type="checkbox"
                checked={accepted}
                onChange={(e) => {
                  setAccepted(e.target.checked)
                  setError(null)
                }}
                aria-describedby={error ? ids.err : undefined}
                className="peer sr-only"
              />
              <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-md border border-forest/60 bg-white transition-colors peer-checked:border-forest peer-checked:bg-forest peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest">
                <Check className={cn("size-3.5 text-ivory transition-transform duration-200", accepted ? "scale-100" : "scale-0")} strokeWidth={3} />
              </span>
              {t("acceptTerms")}
            </label>

            {error ? (
              <p key={error} id={ids.err} role="alert" className="animate-shake text-caption font-medium text-destructive">
                {error}
              </p>
            ) : null}

            <div className="space-y-3">
              <Magnetic strength={0.12} className="w-full [&>button]:w-full">
                <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>
                  {state === "sending" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                  {t("submit")}
                </Button>
              </Magnetic>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/messages/c1">
                  <MessageCircle aria-hidden="true" />
                  {t("messageOwner")}
                </Link>
              </Button>
            </div>
          </form>
        )}
    </div>
  )
}
