import { BadgeCheck, Phone, Star } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { GirihPattern } from "@/components/branding/motifs"
import { Reveal, RevealItem } from "@/components/motion/reveal"
import drill from "../../../public/images/hero-drill.jpg"

export function Trust() {
  const t = useTranslations("home.trust")
  const points = [
    { key: "verified", icon: BadgeCheck },
    { key: "ratings", icon: Star },
    { key: "phone", icon: Phone },
  ] as const

  return (
    <section id="trust" aria-labelledby="trust-title" className="scroll-mt-24 px-3 md:px-[var(--gutter)]">
      <div className="relative isolate mx-auto max-w-[88rem] overflow-hidden rounded-[2rem] bg-forest text-ivory">
        <GirihPattern className="absolute inset-0 -z-10 h-full w-full text-ivory opacity-[0.07]" size={110} />
        <div className="grid gap-12 px-6 py-16 md:px-12 lg:grid-cols-12 lg:gap-14 lg:px-16 lg:py-24">
          <Reveal className="lg:col-span-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] lg:aspect-[4/5]">
              <Image
                src={drill}
                alt={t("portraitAlt")}
                fill
                placeholder="blur"
                sizes="(min-width: 1024px) 34vw, 92vw"
                className="object-cover object-[70%_50%]"
              />
            </div>
          </Reveal>
          <div className="flex flex-col justify-center lg:col-span-7">
            <Reveal>
              <blockquote>
                <p className="font-display text-[clamp(1.75rem,1.3rem+1.8vw,2.875rem)] leading-[1.15] tracking-[-0.01em] text-balance">
                  “{t("quote")}”
                </p>
                <footer className="mt-6 text-body text-sage">
                  <cite className="not-italic">
                    <span className="font-semibold text-ivory">{t("author")}</span>, {t("authorRole")}
                  </cite>
                </footer>
              </blockquote>
            </Reveal>
            <Reveal className="mt-12 border-t border-ivory/15 pt-8">
              <h2 id="trust-title" className="text-[1.5rem] leading-tight text-ivory md:text-[1.75rem]">{t("title")}</h2>
            </Reveal>
            <Reveal as="ul" stagger className="mt-6 grid gap-5 sm:grid-cols-3">
              {points.map(({ key, icon: Icon }) => (
                <RevealItem as="li" key={key} className="flex gap-3 text-caption text-sage sm:flex-col">
                  <Icon className="size-5 shrink-0 text-ochre" strokeWidth={1.7} aria-hidden="true" />
                  {t(`points.${key}`)}
                </RevealItem>
              ))}
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
