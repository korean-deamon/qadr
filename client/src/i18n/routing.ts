import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["uz", "ru", "en"],
  defaultLocale: "uz",
  localePrefix: "always",
  localeCookie: { name: "QADR_LOCALE", maxAge: 60 * 60 * 24 * 365 },
})

export type Locale = (typeof routing.locales)[number]
