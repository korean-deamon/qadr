/** Route families that change the chrome around a page. Paths are locale-less. */
export const AUTH_ROUTES = ["/login", "/register", "/verify", "/forgot-password", "/reset-password"]
/** Guest-only: signed-in users are redirected away (SPEC §11.1) */
export const GUEST_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"]
export const APP_ROUTES = ["/dashboard", "/messages", "/my-items", "/requests", "/borrowings", "/saved", "/notifications", "/settings"]
/** Require a session (incl. owner-only listing pages and admin) */
export const PROTECTED_ROUTES = [...APP_ROUTES, "/items/new", "/admin"]

const matches = (pathname: string, routes: string[]) =>
  routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))

export const isAuthRoute = (pathname: string) => matches(pathname, AUTH_ROUTES)
export const isGuestRoute = (pathname: string) => matches(pathname, GUEST_ROUTES)
export const isProtectedRoute = (pathname: string) =>
  matches(pathname, PROTECTED_ROUTES) || /^\/items\/[^/]+\/edit$/.test(pathname)
export const isAdminRoute = (pathname: string) => matches(pathname, ["/admin"])

const LOCALES = ["uz", "ru", "en"]

/** Accept `next` only if it is a relative, locale-prefixed path on this site. */
export function safeNext(next: string | null | undefined, locale: string): string {
  const fallback = `/${locale}/dashboard`
  if (!next || typeof next !== "string") return fallback
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return fallback
  const first = next.split("/")[1]?.split("?")[0]
  return LOCALES.includes(first) ? next : fallback
}
export const isAppRoute = (pathname: string) => matches(pathname, APP_ROUTES)

