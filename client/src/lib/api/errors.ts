"use client"

import { useTranslations } from "next-intl"
import { useCallback } from "react"
import { ApiError } from "./client"

const KNOWN = new Set([
  "INVALID_CREDENTIALS", "TELEGRAM_REQUIRED", "ACCOUNT_BANNED", "ACCOUNT_RESTRICTED", "RATE_LIMITED", "OTP_INVALID",
  "OTP_EXPIRED", "OTP_ATTEMPTS_EXCEEDED", "EMAIL_TAKEN", "DATES_UNAVAILABLE", "DATES_IN_PAST",
  "DATES_INVALID", "DATES_TOO_LONG", "DATES_TOO_FAR", "TERMS_NOT_ACCEPTED", "CANNOT_BORROW_OWN", "REQUEST_ALREADY_PENDING",
  "INVALID_TRANSITION", "LISTING_HAS_ACTIVE_LOAN", "IMAGE_TOO_LARGE", "IMAGE_INVALID", "IMAGE_TYPE_NOT_ALLOWED",
  "TOO_MANY_IMAGES", "TELEGRAM_NOT_CONFIGURED", "NOT_RETURNED_TOO_EARLY", "ALREADY_RATED", "RATING_WINDOW_CLOSED",
  "REAUTH_REQUIRED", "VALIDATION_ERROR", "CATEGORY_NOT_FOUND", "PICKUP_TOO_EARLY", "REQUEST_EXPIRED", "LISTING_NOT_FOUND",
  "CANNOT_MESSAGE_SELF", "ACCOUNT_HAS_OPEN_LOANS", "LISTING_HIDDEN_BY_ADMIN", "CANNOT_REPORT_SELF", "REPORT_ALREADY_CLOSED",
  "CANNOT_MODERATE_ADMIN", "NOT_RETURNED_NEEDS_LOAN",
])

/** Maps API error codes (stable, SPEC §4) to localized messages. */
export function useApiError() {
  const t = useTranslations("apiErrors")
  return useCallback(
    (error: unknown): string => {
      if (error instanceof ApiError) {
        const b: Record<string, unknown> = error.body ?? {}
        if (error.code === "RATE_LIMITED") return t("RATE_LIMITED", { seconds: Number(b.retry_after ?? 60) })
        if (error.code === "OTP_INVALID") return t("OTP_INVALID", { left: Number(b.attempts_left ?? 0) })
        if (error.code === "DATES_TOO_LONG") return t("DATES_TOO_LONG", { days: Number(b.max_days ?? 0) })
        if (KNOWN.has(error.code)) return t(error.code as "INVALID_CREDENTIALS")
        if (error.status >= 500) return t("SERVER")
        return t("GENERIC")
      }
      return t("NETWORK")
    },
    [t],
  )
}
