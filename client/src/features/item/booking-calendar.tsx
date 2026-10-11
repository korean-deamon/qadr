"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { useDates } from "@/lib/i18n/use-dates"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

const DAY = 86_400_000
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime()

export type Range = { start: Date | null; end: Date | null }

/**
 * Inclusive date-range picker. Past and booked days are disabled; a range
 * may not cross a booking or exceed the owner's maximum length.
 */
export function BookingCalendar({
  today,
  booked,
  maxDays,
  value,
  onChange,
  onTooLong,
}: {
  today: Date
  booked: [Date, Date][]
  maxDays: number
  value: Range
  onChange: (r: Range) => void
  onTooLong: () => void
}) {
  const t = useTranslations("listings.request")
  const dates = useDates()
  const base = startOfDay(today)
  const [month, setMonth] = useState(new Date(base.getFullYear(), base.getMonth(), 1))

  const isBooked = (d: Date) => booked.some(([s, e]) => d >= startOfDay(s) && d <= startOfDay(e))
  const weeks = useMemo(() => {
    const first = new Date(month)
    const offset = (first.getDay() + 6) % 7 // Monday first
    const cells: (Date | null)[] = Array.from({ length: offset }, () => null)
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    for (let d = 1; d <= days; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d))
    while (cells.length % 7) cells.push(null)
    return cells
  }, [month])

  const weekdays = dates.weekdays()

  const pick = (d: Date) => {
    const { start, end } = value
    if (!start || end) return onChange({ start: d, end: null })
    const a = d < start ? d : start
    let b = d < start ? start : d
    const span = Math.round((b.getTime() - a.getTime()) / DAY) + 1
    for (let x = a.getTime(); x <= b.getTime(); x += DAY) {
      if (isBooked(new Date(x))) return onChange({ start: d, end: null })
    }
    if (span > maxDays) {
      onTooLong()
      b = new Date(a.getTime() + (maxDays - 1) * DAY)
    }
    onChange({ start: a, end: b })
  }

  const inRange = (d: Date) => value.start && value.end && d >= value.start && d <= value.end
  const canPrev = month > new Date(base.getFullYear(), base.getMonth(), 1)

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-display text-[1.25rem] text-charcoal first-letter:uppercase" aria-live="polite">
          {dates.monthYear(month)}
        </p>
        <div className="flex gap-1">
          <button type="button" disabled={!canPrev} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label={t("prevMonth")} className="flex size-9 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-sage disabled:opacity-30">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label={t("nextMonth")} className="flex size-9 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-sage">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {weekdays.map((w, i) => (
          <span key={i} aria-hidden="true" className="pb-1 text-meta text-ink-soft">{w}</span>
        ))}
        {weeks.map((d, i) => {
          if (!d) return <span key={i} />
          const past = d < base
          const taken = isBooked(d)
          const isStart = value.start && sameDay(d, value.start)
          const isEnd = value.end && sameDay(d, value.end)
          const mid = inRange(d) && !isStart && !isEnd
          const label = dates.dayMonth(d)
          return (
            <span key={i} className={cn("relative", mid && "bg-sage", isStart && value.end && "rounded-l-full bg-sage", isEnd && "rounded-r-full bg-sage")}>
              <button
                type="button"
                disabled={past || taken}
                onClick={() => pick(d)}
                aria-pressed={!!(isStart || isEnd)}
                aria-label={taken ? `${label}, ${t("booked")}` : label}
                className={cn(
                  "relative mx-auto flex size-10 items-center justify-center rounded-full text-caption tabular-nums transition-[background-color,color,transform] duration-200 active:scale-90",
                  past && "text-line",
                  taken && "text-ink-soft line-through decoration-ink-soft/50 [background:repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_oklab,var(--qadr-border)_80%,transparent)_4px_5px)]",
                  !past && !taken && !isStart && !isEnd && "text-charcoal hover:bg-sage",
                  (isStart || isEnd) && "bg-forest font-semibold text-ivory",
                  sameDay(d, base) && !isStart && !isEnd && "ring-1 ring-forest/40",
                )}
              >
                {d.getDate()}
              </button>
            </span>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-meta text-ink-soft">
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-3 rounded-full bg-forest" />{t("pickDates")}</span>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-3 rounded-full ring-1 ring-line [background:repeating-linear-gradient(135deg,transparent_0_2px,var(--qadr-border)_2px_3px)]" />{t("booked")}</span>
      </div>
    </div>
  )
}
