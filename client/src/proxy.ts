import { hasLocale } from "next-intl"
import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { LOCALE_COOKIE, routing } from "./i18n/routing"

const intl = createMiddleware(routing)

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const prefixed = routing.locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))

  if (!prefixed) {
    const chosen = request.cookies.get(LOCALE_COOKIE)?.value
    if (hasLocale(routing.locales, chosen) && chosen !== routing.defaultLocale) {
      const url = request.nextUrl.clone()
      url.pathname = `/${chosen}${pathname === "/" ? "" : pathname}`
      return NextResponse.redirect(url)
    }
  }
  return intl(request)
}

export const config = {
  // Everything except API, Next internals and files with an extension
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}
