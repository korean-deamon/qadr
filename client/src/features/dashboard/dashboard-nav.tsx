"use client"

import { Bookmark, Inbox, LayoutGrid, MessageCircle, Package, Settings, ShoppingBag, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { isPending } from "@/lib/routes"
import { cn } from "@/lib/utils"

const ITEMS: { key: "overview" | "myItems" | "requests" | "borrowings" | "saved" | "messages" | "settings"; href: string; icon: LucideIcon; count?: number }[] = [
  { key: "overview", href: "/dashboard", icon: LayoutGrid },
  { key: "requests", href: "/requests", icon: Inbox, count: 2 },
  { key: "myItems", href: "/my-items", icon: Package },
  { key: "borrowings", href: "/borrowings", icon: ShoppingBag },
  { key: "saved", href: "/saved", icon: Bookmark },
  { key: "messages", href: "/messages", icon: MessageCircle, count: 2 },
  { key: "settings", href: "/settings", icon: Settings },
]

export function DashboardNav() {
  const t = useTranslations()
  const pathname = usePathname()
  return (
    <nav aria-label={t("dashboard.nav.label")}>
      <ul className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1 lg:px-0" data-lenis-prevent-horizontal>
        {ITEMS.map(({ key, href, icon: Icon, count }) => {
          const active = pathname === href
          const label = key === "messages" ? t("navigation.messages") : t(`dashboard.nav.${key}`)
          return (
            <li key={key} className="shrink-0">
              <Link
                href={href}
                prefetch={isPending(href) ? false : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-full px-4 text-caption font-medium whitespace-nowrap transition-colors duration-200 lg:h-11 lg:rounded-xl",
                  active ? "bg-forest text-ivory" : "bg-white text-charcoal ring-1 ring-line hover:text-forest lg:bg-transparent lg:ring-0 lg:hover:bg-white",
                )}
              >
                <Icon className="size-[1.125rem]" strokeWidth={1.8} aria-hidden="true" />
                {label}
                {count ? (
                  <span className={cn("ml-auto rounded-full px-1.5 text-[0.6875rem] font-semibold", active ? "bg-ivory/20" : "bg-ochre text-charcoal")}>{count}</span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
