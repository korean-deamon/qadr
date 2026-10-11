import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

/** URL-driven tabs (server-rendered, shareable, back-button friendly). */
export function LinkTabs({ label, tabs, active }: { label: string; tabs: { href: string; label: string; count?: number; key: string }[]; active: string }) {
  return (
    <nav aria-label={label} className="-mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] sm:mx-0 sm:px-0" data-lenis-prevent-horizontal>
      <ul className="inline-flex gap-1 rounded-full border border-line bg-white p-1">
        {tabs.map((tab) => {
          const on = tab.key === active
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-4 text-caption font-medium whitespace-nowrap transition-colors duration-200",
                  on ? "bg-forest text-ivory" : "text-charcoal hover:text-forest",
                )}
              >
                {tab.label}
                {tab.count ? (
                  <span className={cn("rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums", on ? "bg-ivory/20" : "bg-ochre text-charcoal")}>{tab.count}</span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
