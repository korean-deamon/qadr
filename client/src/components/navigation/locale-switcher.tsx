"use client"

import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useSession } from "@/components/session/session-provider"
import { Link, usePathname } from "@/i18n/navigation"
import { api } from "@/lib/api/client"
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, routing } from "@/i18n/routing"
import { cn } from "@/lib/utils"

function rememberLocale(locale: string) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
}

const SHORT = { uz: "Oʻz", ru: "Рус", en: "Eng" } as const

function Switcher({ className }: { className?: string }) {
  const t = useTranslations("common")
  const locale = useLocale()
  const pathname = usePathname()
  const search = useSearchParams()
  const { me } = useSession()
  const query = Object.fromEntries(search.entries())

  return (
    <nav aria-label={t("localeSwitcher")} className={cn("flex items-center", className)}>
      <ul className="flex items-center gap-0.5 rounded-full border border-line bg-white/60 p-0.5">
        {routing.locales.map((l) => {
          const active = l === locale
          return (
            <li key={l}>
              <Link
                href={{ pathname, query }}
                locale={l}
                lang={l}
                hrefLang={l}
                aria-current={active ? "true" : undefined}
                title={t(`locales.${l}`)}
                onClick={() => {
                  rememberLocale(l)
                  // signed-in: the profile locale wins and drives emails/Telegram (SPEC §4)
                  if (me) void api("/users/me", { method: "PATCH", json: { preferred_locale: l } }).catch(() => {})
                }}
                className={cn(
                  "block rounded-full px-2.5 py-1 text-meta font-medium transition-colors duration-200",
                  active ? "bg-forest text-ivory" : "text-ink-soft hover:text-forest",
                )}
              >
                <span aria-hidden="true">{SHORT[l]}</span>
                <span className="sr-only">{t(`locales.${l}`)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function LocaleSwitcher({ className }: { className?: string }) {
  return (
    <Suspense fallback={<div className={cn("h-8 w-[8.5rem]", className)} />}>
      <Switcher className={className} />
    </Suspense>
  )
}
