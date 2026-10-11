import type { ReactNode } from "react"
import { ClientMessages } from "@/components/i18n/client-messages"
import { PageTransition } from "@/components/motion/page-transition"
import { RevealText } from "@/components/motion/reveal-text"
import { Avatar } from "@/components/ui/avatar"
import { getMe } from "@/lib/api/server"
import { DashboardNav } from "./dashboard-nav"

/** Shared frame for the signed-in area: profile + section nav on the left, page on the right. */
export async function DashboardShell({
  title,
  lead,
  action,
  aside,
  ns = [],
  children,
}: {
  title?: string
  lead?: string
  action?: ReactNode
  aside?: ReactNode
  ns?: string[]
  children: ReactNode
}) {
  const me = await getMe()
  return (
    <PageTransition>
      <ClientMessages ns={["dashboard", "borrowing", "messages", "report", ...ns]}>
        <div
          className={
            aside
              ? "container-qadr grid grid-cols-1 gap-8 py-8 *:min-w-0 lg:grid-cols-[14rem_1fr] lg:gap-12 lg:py-12 xl:grid-cols-[14rem_1fr_20rem]"
              : "container-qadr grid grid-cols-1 gap-8 py-8 *:min-w-0 lg:grid-cols-[14rem_1fr] lg:gap-12 lg:py-12"
          }
        >
          <aside className="lg:sticky lg:top-[calc(var(--header-height)+3rem)] lg:self-start">
            {me ? (
              <div className="mb-6 hidden items-center gap-3 lg:flex">
                <Avatar name={me.display_name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-display text-[1.25rem] leading-tight text-charcoal">{me.display_name}</p>
                  {me.area ? <p className="text-meta text-ink-soft">{me.area}</p> : null}
                </div>
              </div>
            ) : null}
            <DashboardNav />
          </aside>
          <div className="min-w-0 space-y-10">
            {title ? (
              <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <RevealText as="h1" trigger="load" text={title} className="text-title text-charcoal" />
                  {lead ? <p className="mt-2 max-w-[60ch] text-body text-ink-soft">{lead}</p> : null}
                </div>
                {action}
              </header>
            ) : null}
            {children}
          </div>
          {aside ? <aside className="xl:sticky xl:top-[calc(var(--header-height)+3rem)] xl:self-start">{aside}</aside> : null}
        </div>
      </ClientMessages>
    </PageTransition>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-line px-6 py-14 text-center">
      <p className="font-display text-[1.5rem] text-charcoal">{title}</p>
      {body ? <p className="mt-2 max-w-[40ch] text-caption text-ink-soft">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
