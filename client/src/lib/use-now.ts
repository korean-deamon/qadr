"use client"

import { useSyncExternalStore } from "react"

/**
 * The current time, ticking once a minute, or `null` during SSR and hydration
 * (so relative labels never mismatch between server and browser).
 */
let now: Date | null = null
let timer: number | undefined
const subscribers = new Set<() => void>()

function subscribe(cb: () => void) {
  subscribers.add(cb)
  if (timer === undefined) {
    timer = window.setInterval(() => {
      now = new Date()
      subscribers.forEach((fn) => fn())
    }, 60_000)
  }
  return () => {
    subscribers.delete(cb)
    if (!subscribers.size) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
}

const snapshot = () => (now ??= new Date())
const serverSnapshot = () => null

export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
