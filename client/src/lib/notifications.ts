"use client"

import { useTranslations } from "next-intl"
import { useCallback } from "react"
import { parseDay } from "@/lib/dates"
import { useDates } from "@/lib/i18n/use-dates"

export const NOTIFICATION_TYPES = [
  "request_received", "request_approved", "request_rejected", "request_cancelled", "request_expired",
  "loan_picked_up", "loan_returned", "loan_return_claimed", "loan_cancelled",
  "return_due_tomorrow", "return_due_today", "rating_received", "new_message",
  "moderation_message", "account_warned", "account_restricted", "account_unrestricted",
  "listing_hidden", "listing_removed", "listing_unhidden", "report_resolved", "telegram_linked",
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

const isKnown = (type: string): type is NotificationType => (NOTIFICATION_TYPES as readonly string[]).includes(type)

/** Where a notification leads in the app. */
export function notificationHref(type: string): string | null {
  if (type === "request_received") return "/requests"
  if (type.startsWith("request_")) return "/requests?tab=outgoing"
  if (type.startsWith("loan_") || type.startsWith("return_due") || type === "rating_received") return "/borrowings"
  if (type.startsWith("listing_")) return "/my-items"
  if (type === "new_message") return "/messages"
  if (type === "telegram_linked") return "/settings"
  return null
}

type Payload = Record<string, string | number | null | undefined>

/** Localised one-line text for a notification, from `type` + `payload` (SPEC §14). */
export function useNotificationText() {
  const t = useTranslations("notifications.types")
  const d = useDates()
  return useCallback(
    (type: string, payload: Payload) => {
      if (!isKnown(type)) return t("generic")
      const s = (k: string) => (payload[k] == null ? "" : String(payload[k]))
      const dates = payload.start && payload.end ? d.range(parseDay(s("start")), parseDay(s("end"))) : ""
      const due = payload.due ? d.dayMonth(parseDay(s("due"))) : ""
      const until = payload.until ? d.dayMonth(new Date(s("until"))) : ""
      return t(type, {
        actor: s("actor"), item: s("item"), dates, due, until,
        score: s("score"), reason: s("reason"), text: s("text"), preview: s("preview"), phone: s("phone"),
      })
    },
    [t, d],
  )
}
