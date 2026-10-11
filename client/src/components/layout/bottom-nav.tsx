"use client"

import { Compass, House, MessageCircle, Plus, UserRound, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { useSession } from "@/components/session/session-provider"
import { isAuthRoute, isPending } from "@/lib/routes"
import { cn } from "@/lib/utils"

type Item = {
  key: "home" | "explore" | "add" | "messages" | "profile"
  href: string
  icon: LucideIcon
  badge?: number
}

/**
 * App-style bottom navigation below `md` (SPEC §3 Mobile). Fixed, respects
 * the safe-area inset; <main> reserves matching space via `pb-bottom-nav`.
 */
export function BottomNav() {
  const t = useTranslations("navigation")
  const { me, counters } = useSession()
  const unreadMessages = counters.unread_messages
  const unreadNotifications = counters.unread_notifications + counters.pending_requests
  const pathname = usePathname()
  const items: Item[] = [
    { key: "home", href: "/", icon: House },
    { key: "explore", href: "/explore", icon: Compass },
    { key: "add", href: "/items/new", icon: Plus },
    { key: "messages", href: "/messages", icon: MessageCircle, badge: unreadMessages },
    { key: "profile", href: me ? "/dashboard" : "/login", icon: UserRound, badge: unreadNotifications },
  ]
  if (isAuthRoute(pathname)) return null
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
  const activeIndex = items.findIndex((i) => i.key !== "add" && isActive(i.href))

  return (
    <nav
      aria-label={t("mobileNav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="relative mx-auto grid h-[var(--bottom-nav-height)] max-w-md grid-cols-5 items-stretch px-2">
        {/* active indicator: one bar that glides between slots (CSS transform) */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0 left-2 flex w-[calc((100%-1rem)/5)] justify-center transition-[translate,opacity] duration-500 ease-[var(--ease-qadr)]",
            activeIndex < 0 && "opacity-0",
          )}
          style={{ translate: `${Math.max(activeIndex, 0) * 100}% 0` }}
        >
          <span className="h-[3px] w-7 rounded-b-full bg-ochre" />
        </span>
        {items.map(({ key, href, icon: Icon, badge }) => {
          const active = isActive(href)
          if (key === "add") {
            return (
              <li key={key} className="flex items-center justify-center">
                <Link
                  href={href}
                  prefetch={false}
                  aria-label={t("listItem")}
                  className="flex h-12 w-12 items-center justify-center bg-forest text-ivory shadow-lift transition-transform duration-200 active:scale-95 [clip-path:url(#qadr-arch)]"
                >
                  <Icon className="mt-1.5 size-5" strokeWidth={2} aria-hidden="true" />
                </Link>
              </li>
            )
          }
          return (
            <li key={key}>
              <Link
                href={href}
                prefetch={isPending(href) ? false : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-[color,transform] duration-200 active:scale-95",
                  active ? "text-forest" : "text-ink-soft",
                )}
              >

                <span className="relative">
                  <Icon className="size-[1.375rem]" strokeWidth={active ? 2 : 1.6} aria-hidden="true" />
                  {badge ? (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[1.125rem] rounded-full bg-ochre px-1 text-center text-[0.625rem] leading-[1.125rem] font-semibold text-charcoal ring-2 ring-ivory">
                      <span aria-hidden="true">{badge > 9 ? "9+" : badge}</span>
                      <span className="sr-only">{t("unread", { count: badge })}</span>
                    </span>
                  ) : null}
                </span>
                {t(key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
