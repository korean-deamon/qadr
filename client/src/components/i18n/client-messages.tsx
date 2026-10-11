import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import type { ReactNode } from "react"

/** Namespaces every page's client components need (header, bottom nav, cards). */
const BASE = ["common", "navigation", "listings", "account", "apiErrors"]

type Tree = Record<string, unknown>

function pick(messages: Tree, paths: string[]) {
  const out: Tree = {}
  for (const path of paths) {
    const keys = path.split(".")
    let src: unknown = messages
    let dst = out
    keys.forEach((k, i) => {
      src = (src as Tree | undefined)?.[k]
      if (src === undefined) return
      if (i === keys.length - 1) dst[k] = src
      else dst = (dst[k] ??= {}) as Tree
    })
  }
  return out
}

/**
 * Ships only the dictionaries the client components below actually use, so
 * server-only copy (metadata, footer, hero, errors…) never reaches the browser.
 * A nested provider replaces its parent's messages, so BASE is always included.
 */
export async function ClientMessages({ ns = [], children }: { ns?: string[]; children: ReactNode }) {
  const messages = (await getMessages()) as Tree
  return <NextIntlClientProvider messages={pick(messages, [...BASE, ...ns])}>{children}</NextIntlClientProvider>
}
