"use client"

import { useTranslations } from "next-intl"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useSession } from "@/components/session/session-provider"
import { usePathname, useRouter } from "@/i18n/navigation"
import { refreshSession } from "@/lib/api/client"
import type { ApiMessage } from "@/lib/api/types"
import { notificationHref, useNotificationText } from "@/lib/notifications"
import { notify } from "@/lib/notify"

export type RealtimeEvent =
  | { type: "message.new"; data: { conversation_id: string; message: ApiMessage } }
  | { type: "notification.new"; data: { id: string; type: string; payload: Record<string, string | number | null> } }
  | { type: "listing.created" | "listing.updated" | "listing.deleted"; data: { id: string } }
  | { type: "telegram.linked"; data: { phone: string } }
  | { type: "ping"; data?: undefined }

type Listener = (e: RealtimeEvent) => void
type RealtimeValue = { connected: boolean; subscribe: (fn: Listener) => () => void }

const RealtimeContext = createContext<RealtimeValue>({ connected: false, subscribe: () => () => {} })

/**
 * One WebSocket per tab (SPEC §13): reconnects with jittered backoff, refreshes the
 * session on 4401, gives up on 4403. While disconnected, pages fall back to polling.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { me, refreshCounters, refreshMe } = useSession()
  const t = useTranslations("notifications")
  const text = useNotificationText()
  const router = useRouter()
  const pathname = usePathname()
  const listeners = useRef(new Set<Listener>())
  const [connected, setConnected] = useState(false)
  const path = useRef(pathname)
  useEffect(() => {
    path.current = pathname
  }, [pathname])

  const handle = useRef<Listener>(() => {})
  useEffect(() => {
    handle.current = (e) => {
      listeners.current.forEach((fn) => fn(e))
      if (e.type === "message.new") {
        const mine = e.data.message.sender_id === me?.id
        if (!mine) void refreshCounters()
        const open = path.current === `/messages/${e.data.conversation_id}`
        if (!mine && !open && e.data.message.kind === "text") {
          notify(t("toast.message"), {
            description: e.data.message.body.slice(0, 120),
            action: { label: t("toast.open"), onClick: () => router.push(`/messages/${e.data.conversation_id}`) },
          })
        }
      } else if (e.type === "notification.new") {
        void refreshCounters()
        if (e.data.type === "new_message") return
        const href = notificationHref(e.data.type)
        notify(text(e.data.type, e.data.payload), {
          action: href ? { label: t("toast.open"), onClick: () => router.push(href) } : undefined,
        })
      } else if (e.type === "telegram.linked") {
        void refreshMe()
      }
    }
  }, [me?.id, refreshCounters, refreshMe, router, t, text])

  useEffect(() => {
    if (!me) return
    let ws: WebSocket | null = null
    let attempt = 0
    let timer: number | undefined
    let stopped = false

    const connect = () => {
      if (stopped) return
      const proto = location.protocol === "https:" ? "wss:" : "ws:"
      ws = new WebSocket(`${proto}//${location.host}/api/v1/ws`)
      ws.onopen = () => {
        attempt = 0
        setConnected(true)
        void refreshCounters() // catch up on anything missed while offline
      }
      ws.onmessage = (m) => {
        try {
          handle.current(JSON.parse(String(m.data)) as RealtimeEvent)
        } catch {}
      }
      ws.onclose = async (ev) => {
        setConnected(false)
        if (stopped || ev.code === 4403) return
        if (ev.code === 4401 && !(await refreshSession())) return
        const delay = Math.min(30_000, 1000 * 2 ** attempt++) * (0.75 + Math.random() * 0.5)
        timer = window.setTimeout(connect, delay)
      }
    }
    const onVisible = () => {
      if (document.visibilityState === "visible" && ws?.readyState === WebSocket.CLOSED) {
        window.clearTimeout(timer)
        attempt = 0
        connect()
      }
    }
    connect()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      stopped = true
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
      ws?.close()
    }
  }, [me, refreshCounters])

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn)
    return () => {
      listeners.current.delete(fn)
    }
  }, [])
  const value = useMemo(() => ({ connected, subscribe }), [connected, subscribe])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  return useContext(RealtimeContext)
}

/** Subscribe to live events; `fn` may change between renders. */
export function useRealtimeEvent(fn: Listener) {
  const { subscribe } = useRealtime()
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  })
  useEffect(() => subscribe((e) => ref.current(e)), [subscribe])
}
