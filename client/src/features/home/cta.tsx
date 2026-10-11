import { useTranslations } from "next-intl"
import { ArchOutline, SuzaniMedallion } from "@/components/branding/motifs"
import { RevealText } from "@/components/motion/reveal-text"
import { Reveal } from "@/components/motion/reveal"
import { Magnetic } from "@/components/motion/magnetic"
import { Link } from "@/i18n/navigation"

export function Cta() {
  const t = useTranslations("home.cta")

  return (
    <section aria-labelledby="cta-title">
      <div className="container-qadr py-24 lg:py-32">
        <Reveal className="grid items-center gap-12 md:grid-cols-12">
          <div className="md:col-span-8">
            <RevealText as="h2" id="cta-title" text={t("title")} className="max-w-[20ch] text-title text-charcoal" />
            <p className="mt-5 max-w-[46ch] text-lead text-ink-soft">{t("body")}</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Magnetic>
                <Link
                  href="/items/new"
                  className="inline-flex h-13 items-center rounded-full bg-forest px-8 text-body font-medium text-ivory shadow-soft transition-[background-color,box-shadow,transform] duration-300 hover:bg-forest-deep hover:shadow-lift active:scale-[0.97]"
                >
                  {t("button")}
                </Link>
              </Magnetic>
              <Link
                href="/explore"
                className="font-medium text-forest underline decoration-forest/30 underline-offset-[6px] transition-colors hover:decoration-forest"
              >
                {t("secondary")}
              </Link>
            </div>
          </div>
          <div aria-hidden="true" className="relative mx-auto hidden aspect-[3/4] w-full max-w-[17rem] md:col-span-4 md:block">
            <ArchOutline className="inset-0 h-full w-full text-forest/30" />
            <ArchOutline className="inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] text-forest/15" />
            <SuzaniMedallion className="absolute inset-x-[9%] top-[30%] aspect-square" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
