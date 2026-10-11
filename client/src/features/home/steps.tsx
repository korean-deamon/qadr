import { useFormatter, useTranslations } from "next-intl"
import { Reveal, RevealItem } from "@/components/motion/reveal"

const steps = ["find", "ask", "return"] as const

/**
 * A real sequence, so numbering carries meaning. Set as an editorial
 * colophon: hanging display numerals on a ruled baseline.
 */
export function Steps() {
  const t = useTranslations("home.steps")
  const format = useFormatter()

  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="scroll-mt-24">
      <div className="container-qadr grid gap-12 py-20 lg:grid-cols-12 lg:gap-10 lg:py-28">
        <Reveal className="lg:col-span-3">
          <h2 id="steps-title" className="max-w-[10ch] text-title text-charcoal">{t("title")}</h2>
        </Reveal>
        <Reveal as="ol" stagger className="grid gap-x-10 lg:col-span-9 md:grid-cols-3">
          {steps.map((s, i) => (
            <RevealItem
              as="li"
              key={s}
              className="grid grid-cols-[4.5rem_1fr] gap-x-4 border-t border-charcoal/80 pt-5 pb-10 md:block md:pb-0"
            >
              <span aria-hidden="true" className="block font-display text-[4.5rem] leading-[0.8] text-forest md:text-[6.5rem]">
                {format.number(i + 1)}
              </span>
              <div>
                <h3 className="text-[1.5rem] leading-tight text-charcoal md:mt-8 md:text-[1.625rem]">{t(`${s}.title`)}</h3>
                <p className="mt-3 max-w-[32ch] text-body text-ink-soft">{t(`${s}.body`)}</p>
              </div>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
