import { ViewTransition, type ReactNode } from "react"

/** Soft cross-fade between routes (React <ViewTransition>, see globals.css). */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-fade" exit="page-fade" default="none">
      {children}
    </ViewTransition>
  )
}
