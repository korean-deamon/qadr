"use client"

import type { ApiErrorBody } from "./types"

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public body: ApiErrorBody["error"] | null,
  ) {
    super(code)
  }
}

function csrf(): string {
  const m = document.cookie.match(/(?:^|;\s*)qadr_csrf=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : ""
}

let refreshing: Promise<boolean> | null = null

/** One refresh at a time for the whole tab (SPEC §11.1 client fetch wrapper). */
export function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/v1/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
    headers: { "x-csrf-token": csrf() },
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => (refreshing = null), 0)
    })
  return refreshing
}

function toLogin() {
  const locale = location.pathname.split("/")[1] || "uz"
  const next = location.pathname + location.search
  // Not inside React (no router available): a hard navigation is the only option.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/${locale}/login?next=${encodeURIComponent(next)}`
}

/** Telegram was unlinked meanwhile (another tab, admin): back to the gate (SPEC §11). */
function toConnectTelegram() {
  const locale = location.pathname.split("/")[1] || "uz"
  if (location.pathname.startsWith(`/${locale}/connect-telegram`)) return
  const next = location.pathname + location.search
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/${locale}/connect-telegram?next=${encodeURIComponent(next)}`
}

type Options = Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit; retry?: boolean; redirectOn401?: boolean }

/** Browser API call: same-origin cookies, CSRF header, JSON, one silent refresh on 401. */
export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { json, retry = true, redirectOn401 = true, ...init } = opts
  const method = (init.method ?? (json !== undefined ? "POST" : "GET")).toUpperCase()
  const headers: Record<string, string> = { accept: "application/json", ...(init.headers as Record<string, string>) }
  if (json !== undefined) headers["content-type"] = "application/json"
  if (!["GET", "HEAD"].includes(method)) headers["x-csrf-token"] = csrf()
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    method,
    credentials: "same-origin",
    headers,
    body: json !== undefined ? JSON.stringify(json) : init.body,
  })
  if (res.status === 401 && retry) {
    const body = (await res.clone().json().catch(() => null)) as ApiErrorBody | null
    const code = body?.error.code
    if (code === "TOKEN_EXPIRED" || code === "NOT_AUTHENTICATED" || code === "TOKEN_INVALID") {
      if (await refreshSession()) return api<T>(path, { ...opts, retry: false })
      if (redirectOn401) toLogin()
    }
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null
    if (res.status === 403 && body?.error.code === "TELEGRAM_REQUIRED") toConnectTelegram()
    throw new ApiError(res.status, body?.error.code ?? `HTTP_${res.status}`, body?.error ?? null)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
