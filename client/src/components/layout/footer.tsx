import { getTranslations } from "next-intl/server"
import { Logo } from "@/components/branding/logo"
import { GirihPattern } from "@/components/branding/motifs"
import { Link } from "@/i18n/navigation"

export async function Footer() {
  const t = await getTranslations("footer")
  const nav = await getTranslations("navigation")
  const common = await getTranslations("common")

  const columns = [
    {
      title: t("borrow"),
      links: [
        { href: "/explore", label: nav("explore") },
        { href: "/#categories", label: nav("categories") },
        { href: "/#how-it-works", label: nav("howItWorks") },
      ],
    },
    {
      title: t("lend"),
      links: [
        { href: "/items/new", label: nav("listItem") },
        { href: "/#how-it-works", label: t("lendingTips") },
      ],
    },
    {
      title: t("company"),
      links: [
        { href: "/#trust", label: t("trustSafety") },
        { href: "mailto:hello@qadr.uz", label: t("contact") },
      ],
    },
  ]

  return (
    <footer className="relative isolate overflow-hidden border-t border-line bg-sage text-charcoal">
      <GirihPattern className="absolute inset-0 -z-10 h-full w-full text-forest opacity-[0.06]" size={120} />
      <div className="container-qadr grid gap-12 pt-16 pb-10 md:grid-cols-12 md:pt-20">
        <div className="md:col-span-5">
          <Logo variant="full" className="-ml-1 w-28" />
          <p className="mt-6 max-w-sm font-display text-[1.5rem] leading-snug text-forest">{common("tagline")}</p>
          <p className="mt-3 max-w-sm text-caption text-ink-soft">{t("about")}</p>
        </div>
        <nav aria-label={nav("footerNav")} className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="font-sans text-caption font-semibold text-forest">{col.title}</h2>
              <ul className="mt-4 space-y-3 text-caption">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-charcoal underline-offset-4 transition-colors hover:text-forest hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="container-qadr border-t border-line py-6 text-meta text-ink-soft">
        {t("rights", { year: 2026 })}
      </div>
    </footer>
  )
}
