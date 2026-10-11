"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { api } from "@/lib/api/client"
import type { Counters, Me } from "@/lib/api/types"

type SessionValue = {
  me: Me | null
  counters: Counters
  setMe: (me: Me | null) => void
  refreshMe: () => Promise<void>
  refreshCounters: () => Promise<void>
  bump: (patch: Partial<Counters>) => void
  logout: () => Promise<void>
}

const ZERO: Counters = { unread_messages: 0, unread_notifications: 0, pending_requests: 0 }
const SessionContext = createContext<SessionValue | null>(null)

/** Signed-in user (seeded by the server render) + live unread counters. */
export function SessionProvider({ initialMe, children }: { initialMe: Me | null; children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(initialMe)
  const [counters, setCounters] = useState<Counters>(ZERO)

  const refreshCounters = useCallback(async () => {
    if (!me) return
    try {
      setCounters(await api<Counters>("/me/counters", { redirectOn401: false }))
    } catch {}
  }, [me])

  const refreshMe = useCallback(async () => {
    try {
      setMe(await api<Me>("/auth/me", { redirectOn401: false }))
    } catch {
      setMe(null)
    }
  }, [])

  const bump = useCallback((patch: Partial<Counters>) => setCounters((c) => ({ ...c, ...patch })), [])

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST", redirectOn401: false, retry: false })
    } catch {
      // the session is gone locally either way; cookies expire on their own
    }
    setMe(null)
    setCounters(ZERO)
  }, [])

  useEffect(() => {
    if (!me) return
    const first = window.setTimeout(refreshCounters, 0)
    const id = window.setInterval(refreshCounters, 60_000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [me, refreshCounters])

  const value = useMemo(
    () => ({ me, counters, setMe, refreshMe, refreshCounters, bump, logout }),
    [me, counters, refreshMe, refreshCounters, bump, logout],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession outside SessionProvider")
  return ctx
}
