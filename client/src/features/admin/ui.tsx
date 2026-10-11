import type { ReactNode } from "react"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export function AdminHeader({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-title text-charcoal">{title}</h1>
        {lead ? <p className="mt-2 max-w-[62ch] text-body text-ink-soft">{lead}</p> : null}
      </div>
      {children}
    </header>
  )
}

const TONES: Record<string, string> = {
  high: "bg-destructive text-white",
  normal: "bg-white text-ink-soft ring-1 ring-line",
  open: "bg-ochre/25 text-charcoal",
  in_review: "bg-sage text-forest",
  resolved: "bg-forest text-ivory",
  dismissed: "bg-white text-ink-soft ring-1 ring-line",
  active: "bg-sage text-forest",
  hidden_by_owner: "bg-white text-ink-soft ring-1 ring-line",
  hidden_by_admin: "bg-destructive/10 text-destructive",
  removed: "bg-charcoal text-ivory",
  banned: "bg-destructive text-white",
  restricted: "bg-ochre text-charcoal",
  admin: "bg-charcoal text-ivory",
}

export function Pill({ tone, children, className }: { tone: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-meta font-semibold whitespace-nowrap", TONES[tone] ?? "bg-white text-ink-soft ring-1 ring-line", className)}>
      {children}
    </span>
  )
}

export function Card({ title, children, className, action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-[1.5rem] border border-line bg-white p-5 md:p-6", className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[1.375rem] leading-tight text-charcoal">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/** GET filter bar: plain form so filters live in the URL. */
export function FilterBar({ children, reset }: { children: ReactNode; reset: { href: string; label: string } }) {
  return (
    <form className="mb-6 flex flex-wrap items-end gap-3 rounded-[1.5rem] border border-line bg-white p-4">
      {children}
      <Link href={reset.href} className="ml-auto self-center px-2 text-meta font-medium text-ink-soft hover:text-forest">{reset.label}</Link>
    </form>
  )
}

export const selectClass =
  "h-10 rounded-full border border-line bg-white px-4 text-caption text-charcoal focus:border-forest/50 focus:outline-none"
export const inputClass =
  "h-10 min-w-0 rounded-full border border-line bg-white px-4 text-caption text-charcoal placeholder:text-ink-soft focus:border-forest/50 focus:outline-none"

export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-meta font-medium text-ink-soft">
      {label}
      {children}
    </label>
  )
}

export function Pager({ page, total, size, href, label }: { page: number; total: number; size: number; href: (p: number) => string; label: string }) {
  const pages = Math.max(1, Math.ceil(total / size))
  if (pages <= 1) return null
  return (
    <nav className="mt-6 flex items-center justify-center gap-2 text-caption" aria-label={label}>
      {page > 1 ? <Link href={href(page - 1)} className="rounded-full px-4 py-2 ring-1 ring-line hover:text-forest">←</Link> : null}
      <span className="px-3 text-ink-soft tabular-nums">{page} / {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className="rounded-full px-4 py-2 ring-1 ring-line hover:text-forest">→</Link> : null}
    </nav>
  )
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v))
  const s = u.toString()
  return s ? `?${s}` : ""
}
