"use client"

import { Toaster as Sonner } from "sonner"

/** Sonner, fully restyled to Qadr tokens. Sits above the mobile bottom nav. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={{ bottom: 24 }}
      mobileOffset={{ bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 12px)" }}
      gap={10}
      duration={3600}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[min(92vw,24rem)] items-center gap-3 rounded-2xl border border-forest-deep/40 bg-charcoal px-4 py-3.5 text-caption text-ivory shadow-lift",
          title: "font-medium",
          description: "text-sage",
          icon: "text-ochre",
          actionButton:
            "ml-auto shrink-0 rounded-full bg-ivory/10 px-3 py-1.5 text-meta font-semibold text-ochre transition-colors hover:bg-ivory/20",
          success: "",
        },
      }}
    />
  )
}
