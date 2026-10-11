import { hasLocale, IntlErrorCode } from "next-intl"
import { getRequestConfig } from "next-intl/server"
import * as rootParams from "next/root-params"
import { notFound } from "next/navigation"
import { routing } from "./routing"

const isDev = process.env.NODE_ENV !== "production"

export default getRequestConfig(async () => {
  const param = await rootParams.locale()
  if (!hasLocale(routing.locales, param)) notFound()
  const locale = param

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    onError(error) {
      // Missing keys are a bug: loud in development, silent in production.
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        if (isDev) console.error(`[i18n] ${error.message}`)
        return
      }
      console.error(error)
    },
    getMessageFallback({ key, namespace, error }) {
      const path = [namespace, key].filter(Boolean).join(".")
      // Never surface raw keys to users; make them obvious in development.
      if (isDev) return `⚠ ${path}`
      return error.code === IntlErrorCode.MISSING_MESSAGE ? "" : path
    },
  }
})
