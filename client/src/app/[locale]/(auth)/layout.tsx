import { ClientMessages } from "@/components/i18n/client-messages"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Logo } from "@/components/branding/logo"
import { ArchOutline, GirihPattern } from "@/components/branding/motifs"
import { LocaleSwitcher } from "@/components/navigation/locale-switcher"
import { Link } from "@/i18n/navigation"
import tent from "../../../../public/images/tent-view.jpg"

/** Focused split screen for sign-in flows: no header, footer or bottom nav. */
export default async function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const t = await getTranslations()
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,46%)]">
      <div className="flex flex-col px-[var(--gutter)] pt-6 pb-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label={t("navigation.home")} className="rounded-md">
            <Logo variant="full" priority className="w-20" />
          </Link>
          <LocaleSwitcher />
        </div>
        <main id="main" className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
          <ClientMessages ns={["auth", "validation"]}>{children}</ClientMessages>
        </main>
      </div>

      <aside aria-hidden="true" className="relative isolate hidden overflow-hidden bg-forest lg:block">
        <GirihPattern className="absolute inset-0 -z-10 h-full w-full text-ivory opacity-[0.08]" size={96} />
        <div className="flex h-full flex-col items-center justify-center px-12 py-16">
          <div className="relative aspect-[4/5] w-full max-w-[22rem]">
            <ArchOutline className="-inset-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)] text-ochre/50" />
            <div className="relative h-full overflow-hidden [clip-path:url(#qadr-arch)]">
              <Image src={tent} alt="" fill sizes="22rem" placeholder="blur" className="object-cover object-[50%_62%]" />
            </div>
          </div>
          <p className="mt-14 max-w-[16ch] text-center font-display text-[2.75rem] leading-[1.05] text-ivory">{t("common.tagline")}</p>
          <p className="mt-4 max-w-[34ch] text-center text-caption text-sage">{t("home.hero.caption")}</p>
        </div>
      </aside>
    </div>
  )
}
