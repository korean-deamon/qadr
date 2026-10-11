import { routing } from "@/i18n/routing"

/** Absolute site origin for metadata (canonical + hreflang). */
export const SITE_URL = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")

/** hreflang alternates for a locale-less path, e.g. "/explore". */
export function alternatesFor(path: string) {
  const suffix = path === "/" ? "" : path
  return {
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${suffix}`])),
      "x-default": `/${routing.defaultLocale}${suffix}`,
    },
  }
}
