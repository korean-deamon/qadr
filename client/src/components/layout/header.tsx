"use client"

import { Bell } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { Logo } from "@/components/branding/logo"
import { Magnetic } from "@/components/motion/magnetic"
import { LocaleSwitcher } from "@/components/navigation/locale-switcher"
import { Avatar } from "@/components/ui/avatar"
import { Link, usePathname } from "@/i18n/navigation"
import { isAppRoute, isAuthRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"

/**
 * Site header, persistent across routes. Slides away while scrolling down and
 * returns on scroll up (pattern adapted from m.dev's scroll-direction header).
 */
export function Header() {
  const t = useTranslations("navigation")
  const pathname = usePathname()
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let prev = window.scrollY
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        setScrolled(y > 8)
        setHidden(y > prev && y > 240)
        prev = y
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  if (isAuthRoute(pathname)) return null
  const app = isAppRoute(pathname)
  const links = app
    ? [
        { href: "/explore", label: t("explore") },
        { href: "/dashboard", label: t("dashboard") },
        { href: "/messages", label: t("messages") },
      ]
    : [
        { href: "/explore", label: t("explore") },
        { href: "/#categories", label: t("categories") },
        { href: "/#how-it-works", label: t("howItWorks") },
      ]

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 h-[var(--header-height)] border-b transition-[background-color,border-color,translate] duration-300 ease-[var(--ease-qadr)]",
        hidden && "-translate-y-full",
        scrolled || app
          ? "border-line bg-ivory/90 backdrop-blur-md supports-[backdrop-filter]:bg-ivory/75"
          : "border-transparent bg-ivory",
      )}
    >
      <div className={cn("flex h-full items-center gap-8", app ? "px-[var(--gutter)]" : "container-qadr")}>
        <Link href="/" aria-label={t("home")} className="shrink-0 rounded-md">
          <Logo priority />
        </Link>

        <nav aria-label={t("mainNav")} className="hidden md:block">
          <ul className="flex items-center gap-7 text-caption font-medium text-charcoal">
            {links.map((l) => {
              const active = l.href !== "/" && (pathname === l.href || pathname.startsWith(`${l.href}/`))
              return (
                <li key={l.href}>
                  <NavLink href={l.href} active={active}>{l.label}</NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:gap-5">
          <LocaleSwitcher />
          {app ? (
            <>
              <Link
                href="/notifications"
                prefetch={false}
                aria-label={t("notifications")}
                className="relative hidden size-10 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-sage hover:text-forest md:flex"
              >
                <Bell className="size-5" strokeWidth={1.7} aria-hidden="true" />
                <span className="absolute top-2 right-2.5 size-2 rounded-full bg-ochre ring-2 ring-ivory" aria-hidden="true" />
              </Link>
              <Link href="/dashboard" aria-label={t("profile")} className="hidden rounded-full md:block">
                <Avatar name="Dilnoza Karimova" />
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden text-caption font-medium text-charcoal underline-offset-4 hover:text-forest hover:underline md:inline"
            >
              {t("login")}
            </Link>
          )}
          <Magnetic className="hidden md:inline-flex">
            <Link
              href="/items/new"
              prefetch={false}
              className="inline-flex h-10 items-center rounded-full bg-forest px-5 text-caption font-medium text-ivory transition-[background-color,transform] duration-200 hover:bg-forest-deep active:scale-[0.97]"
            >
              {t("listItem")}
            </Link>
          </Magnetic>
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative py-2 transition-colors duration-200 hover:text-forest after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:bg-forest after:transition-transform after:duration-300 after:ease-[var(--ease-qadr)] hover:after:scale-x-100",
        active ? "text-forest after:scale-x-100" : "after:scale-x-0",
      )}
    >
      {children}
    </Link>
  )
}
