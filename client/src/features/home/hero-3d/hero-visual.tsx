"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { useCan3D } from "./use-can-3d"

const PortalScene = dynamic(() => import("./portal-scene"), { ssr: false })

/**
 * Server-rendered static figure first (fast LCP, no layout shift); on capable
 * desktops the WebGL portal is fetched after the page goes idle and
 * cross-fades in over it once its first frame has rendered.
 */
export function HeroVisual({ children, photo }: { children: ReactNode; photo: string }) {
  const can3d = useCan3D()
  const [idle, setIdle] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!can3d) return
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const id = ric(() => setIdle(true), { timeout: 2500 })
    return () => cancel(id)
  }, [can3d])

  const show3d = can3d && idle
  return (
    <div className="relative">
      <div className={cn("transition-opacity duration-1000 ease-[var(--ease-qadr)]", show3d && ready && "opacity-0")}>
        {children}
      </div>
      {show3d ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -top-[8%] -right-[6%] -bottom-[6%] -left-[16%] transition-opacity duration-1000 ease-[var(--ease-qadr)]",
            ready ? "opacity-100" : "opacity-0",
          )}
        >
          <PortalScene photo={photo} onReady={() => setReady(true)} />
        </div>
      ) : null}
    </div>
  )
}
