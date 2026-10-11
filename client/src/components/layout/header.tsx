"use client"

import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { Logo } from "@/components/branding/logo"
import { LocaleSwitcher } from "@/components/navigation/locale-switcher"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

/**
 * Site header. Slides away while scrolling down and returns on scroll up
 * (pattern adapted from motion.dev's scroll-direction header).
 */
export function Header() {
  const t = useTranslations("navigation")
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setScrolled(y > 8)
    setHidden(y > prev && y > 240)
  })

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden && !reduce ? "-100%" : "0%" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-40 h-[var(--header-height)] border-b transition-[background-color,border-color] duration-300",
        scrolled
          ? "border-line bg-ivory/90 backdrop-blur-md supports-[backdrop-filter]:bg-ivory/75"
          : "border-transparent bg-ivory",
      )}
    >
      <div className="container-qadr flex h-full items-center gap-8">
        <Link href="/" aria-label={t("home")} className="shrink-0 rounded-md">
          <Logo priority />
        </Link>

        <nav aria-label={t("mainNav")} className="hidden md:block">
          <ul className="flex items-center gap-7 text-caption font-medium text-charcoal">
            <li><NavLink href="/explore">{t("explore")}</NavLink></li>
            <li><NavLink href="/#categories">{t("categories")}</NavLink></li>
            <li><NavLink href="/#how-it-works">{t("howItWorks")}</NavLink></li>
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:gap-5">
          <LocaleSwitcher />
          <Link
            href="/login"
            className="hidden text-caption font-medium text-charcoal underline-offset-4 hover:text-forest hover:underline md:inline"
          >
            {t("login")}
          </Link>
          <Link
            href="/items/new"
            className="hidden h-10 items-center rounded-full bg-forest px-5 text-caption font-medium text-ivory transition-colors duration-200 hover:bg-forest-deep md:inline-flex"
          >
            {t("listItem")}
          </Link>
        </div>
      </div>
    </motion.header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative py-2 transition-colors duration-200 hover:text-forest after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-forest after:transition-transform after:duration-300 after:ease-[var(--ease-qadr)] hover:after:scale-x-100"
    >
      {children}
    </Link>
  )
}
