import { hasLocale } from "next-intl"
import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { LOCALE_COOKIE, routing } from "./i18n/routing"
import { CONNECT_TELEGRAM, isConnectRoute, isGuestRoute, isProtectedRoute, safeNext } from "./lib/routes"

const intl = createMiddleware(routing)
const API = process.env.API_INTERNAL_URL ?? "http://localhost:8000"
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

type Claims = { exp?: number; tg?: boolean }

/** Unverified read of the access token. Routing hints only: the API checks every request. */
function claims(token: string | undefined): Claims | null {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as Claims
  } catch {
    return null
  }
}

function accessValid(token: string | undefined): boolean {
  const exp = claims(token)?.exp
  return typeof exp === "number" && exp * 1000 > Date.now() + 5000
}

/** Refresh server-to-server and return the rotated Set-Cookie headers (or null). */
async function refresh(request: NextRequest): Promise<string[] | null> {
  const r = request.cookies.get("qadr_refresh")?.value
  if (!r) return null
  const csrf = request.cookies.get("qadr_csrf")?.value ?? "proxy"
  try {
    const res = await fetch(`${API}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { cookie: `qadr_refresh=${r}; qadr_csrf=${csrf}`, "x-csrf-token": csrf, origin: ORIGIN },
      cache: "no-store",
    })
    return res.ok ? res.headers.getSetCookie() : null
  } catch {
    return null
  }
}

function parseSetCookie(lines: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of lines) {
    const [pair] = line.split(";")
    const i = pair.indexOf("=")
    if (i > 0) out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim()
  }
  return out
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const segments = pathname.split("/")
  const prefixed = hasLocale(routing.locales, segments[1])

  if (!prefixed) {
    const chosen = request.cookies.get(LOCALE_COOKIE)?.value
    if (hasLocale(routing.locales, chosen) && chosen !== routing.defaultLocale) {
      const url = request.nextUrl.clone()
      url.pathname = `/${chosen}${pathname === "/" ? "" : pathname}`
      return NextResponse.redirect(url)
    }
    return intl(request)
  }

  const locale = segments[1]
  const path = "/" + segments.slice(2).join("/")
  const access = request.cookies.get("qadr_access")?.value
  const hasRefresh = Boolean(request.cookies.get("qadr_refresh"))
  let signedIn = accessValid(access)
  let rotated: string[] | null = null

  // Refresh on any page (not just protected ones): a signed-in user without
  // Telegram must be sent to connect it wherever they land.
  if (!signedIn && hasRefresh) {
    rotated = await refresh(request)
    signedIn = rotated !== null
  }
  const deadRefresh = hasRefresh && !signedIn

  const needsRedirectToLogin = (isProtectedRoute(path) || isConnectRoute(path)) && !signedIn
  if (needsRedirectToLogin) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    const res = NextResponse.redirect(url)
    if (deadRefresh) res.cookies.delete("qadr_refresh")
    return res
  }

  // Signed in without Telegram: nothing but the connect page until it is linked.
  const fresh = rotated ? parseSetCookie(rotated)["qadr_access"] : access
  if (signedIn && claims(fresh)?.tg === false && !isConnectRoute(path)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${CONNECT_TELEGRAM}`
    url.search = isProtectedRoute(path) || path === "/" ? `?next=${encodeURIComponent(pathname + search)}` : ""
    const res = NextResponse.redirect(url)
    rotated?.forEach((c) => res.headers.append("set-cookie", c))
    return res
  }

  if (isGuestRoute(path) && signedIn) {
    const url = new URL(safeNext(request.nextUrl.searchParams.get("next"), locale), request.url)
    const res = NextResponse.redirect(url)
    rotated?.forEach((c) => res.headers.append("set-cookie", c))
    return res
  }

  if (rotated) {
    // Make the fresh cookies visible to this render *and* store them in the browser.
    const fresh = parseSetCookie(rotated)
    const merged = new Map(request.cookies.getAll().map((c) => [c.name, c.value]))
    Object.entries(fresh).forEach(([k, v]) => merged.set(k, v))
    const headers = new Headers(request.headers)
    headers.set("cookie", [...merged].map(([k, v]) => `${k}=${v}`).join("; "))
    headers.set("x-qadr-path", pathname + search)
    // Locale-prefixed path: nothing for the intl middleware to do, so override
    // the request headers directly for the downstream server render.
    const res = NextResponse.next({ request: { headers } })
    rotated.forEach((c) => res.headers.append("set-cookie", c))
    return res
  }
  const headers = new Headers(request.headers)
  headers.set("x-qadr-path", pathname + search)
  const res = NextResponse.next({ request: { headers } })
  if (deadRefresh) res.cookies.delete("qadr_refresh") // stop retrying a revoked/expired session
  return res
}

export const config = {
  // Everything except API, Next internals and files with an extension
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}
