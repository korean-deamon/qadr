/** Route families that change the chrome around a page. Paths are locale-less. */
export const AUTH_ROUTES = ["/login", "/register", "/verify", "/forgot-password", "/reset-password"]
export const APP_ROUTES = ["/dashboard", "/messages", "/my-items", "/requests", "/borrowings", "/saved", "/notifications", "/settings"]

const matches = (pathname: string, routes: string[]) =>
  routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))

export const isAuthRoute = (pathname: string) => matches(pathname, AUTH_ROUTES)
export const isAppRoute = (pathname: string) => matches(pathname, APP_ROUTES)

/** Linked from the UI but built in later phases; not prefetched until they exist. */
export const PENDING_ROUTES = ["/items/new", "/notifications", "/requests", "/my-items", "/borrowings", "/saved", "/settings", "/categories", "/users"]
export const isPending = (href: string) => matches(href.split("?")[0], PENDING_ROUTES)
