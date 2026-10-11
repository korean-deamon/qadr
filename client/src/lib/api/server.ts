import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"
import type { Me } from "./types"

const API = process.env.API_INTERNAL_URL ?? "http://localhost:8000"

export class ServerApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code)
  }
}

/** Server-side fetch to the API with the visitor's cookies forwarded (never cached). */
export async function apiServer<T>(path: string, init: RequestInit = {}): Promise<T> {
  const jar = await cookies()
  const cookie = jar
    .getAll()
    .filter((c) => c.name.startsWith("qadr_"))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")
  const res = await fetch(`${API}/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: { ...(cookie ? { cookie } : {}), accept: "application/json", ...init.headers },
  })
  if (!res.ok) {
    let code = `HTTP_${res.status}`
    try {
      code = ((await res.json()) as { error?: { code?: string } }).error?.code ?? code
    } catch {}
    throw new ServerApiError(res.status, code)
  }
  return (await res.json()) as T
}

/** Like apiServer, but returns null for 404 (and 401/403 when `soft`). */
export async function apiOrNull<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await apiServer<T>(path, init)
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 404) return null
    throw e
  }
}

/** The signed-in user, or null for visitors / expired sessions. */
export const getMe = cache(async (): Promise<Me | null> => {
  const jar = await cookies()
  if (!jar.get("qadr_access")) return null
  try {
    return await apiServer<Me>("/auth/me")
  } catch (e) {
    if (e instanceof ServerApiError && (e.status === 401 || e.status === 403)) return null
    throw e
  }
})

/** Rounded browser location, set by the client only after the user granted geolocation. */
export async function getLocation(): Promise<{ lat: number; lng: number } | null> {
  const raw = (await cookies()).get("qadr_loc")?.value
  if (!raw) return null
  const [lat, lng] = raw.split(",").map(Number)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}
