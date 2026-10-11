"use client"

import { useTranslations } from "next-intl"

/**
 * Date labels for Client Components, built from our dictionaries rather than
 * Intl: browsers ship incomplete Uzbek ICU data (Chromium prints "2026 M10"),
 * which would also cause hydration mismatches against Node's full ICU.
 */
export function useDates() {
  const t = useTranslations("common.calendar")
  const k = (d: Date) => String(d.getMonth()) as "0"
  return {
    monthYear: (d: Date) => t("monthYear", { month: t(`month.${k(d)}`), year: d.getFullYear() }),
    dayMonth: (d: Date) => t("dayMonth", { day: d.getDate(), month: t(`monthOf.${k(d)}`) }),
    dayMonthShort: (d: Date) => t("dayMonth", { day: d.getDate(), month: t(`monthShort.${k(d)}`) }),
    range: (a: Date, b: Date) =>
      a.getMonth() === b.getMonth()
        ? t("range", { start: String(a.getDate()), end: t("dayMonth", { day: b.getDate(), month: t(`monthShort.${k(b)}`) }) })
        : t("range", {
            start: t("dayMonth", { day: a.getDate(), month: t(`monthShort.${k(a)}`) }),
            end: t("dayMonth", { day: b.getDate(), month: t(`monthShort.${k(b)}`) }),
          }),
    weekdays: () => Array.from({ length: 7 }, (_, i) => t(`weekday.${String(i) as "0"}`)),
  }
}
