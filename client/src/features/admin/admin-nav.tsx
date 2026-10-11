"use client"

import { Flag, LayoutGrid, Package, ScrollText, ShieldCheck, Users, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

const ITEMS: { key: "overview" | "reports" | "users" | "listings" | "audit"; href: string; icon: LucideIcon }[] = [
  { key: "overview", href: "/admin", icon: LayoutGrid },
  { key: "reports", href: "/admin/reports", icon: Flag },
  { key: "users", href: "/admin/users", icon: Users },
  { key: "listings", href: "/admin/listings", icon: Package },
  { key: "audit", href: "/admin/audit-log", icon: ScrollText },
]

export function AdminNav() {
  const t = useTranslations("admin.nav")
  const pathname = usePathname()
  return (
    <nav aria-label={t("label")}>
      <p className="mb-4 hidden items-center gap-2 text-meta font-semibold tracking-wide text-ochre uppercase lg:flex">
        <ShieldCheck className="size-4" aria-hidden="true" />
        {t("label")}
      </p>
      <ul className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1 lg:px-0" data-lenis-prevent-horizontal>
        {ITEMS.map(({ key, href, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href)
          return (
            <li key={key} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-full px-4 text-caption font-medium whitespace-nowrap transition-colors duration-200 lg:h-11 lg:rounded-xl",
                  active ? "bg-charcoal text-ivory" : "bg-white text-charcoal ring-1 ring-line hover:text-forest lg:bg-transparent lg:ring-0 lg:hover:bg-white",
                )}
              >
                <Icon className="size-[1.125rem]" strokeWidth={1.8} aria-hidden="true" />
                {t(key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
