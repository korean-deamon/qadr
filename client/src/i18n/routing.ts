import { defineRouting } from "next-intl/routing"

/** Cookie that remembers the visitor's explicit language choice (SPEC §4). */
export const LOCALE_COOKIE = "QADR_LOCALE"
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const routing = defineRouting({
  locales: ["uz", "ru", "en"],
  defaultLocale: "uz",
  localePrefix: "always",
  // Always land on /uz unless the visitor chose a language themselves;
  // that choice is handled in proxy.ts via LOCALE_COOKIE.
  localeDetection: false,
  localeCookie: false,
})

export type Locale = (typeof routing.locales)[number]
