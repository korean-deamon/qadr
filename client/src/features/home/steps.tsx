"use client"

import { CalendarDays, Check, MapPin, Phone, Search, Star } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { lazy, Suspense, useSyncExternalStore } from "react"
import { GirihPattern } from "@/components/branding/motifs"
import { Reveal } from "@/components/motion/reveal"
import { RevealItem } from "@/components/motion/reveal-item"
import { RevealText } from "@/components/motion/reveal-text"

const PinnedStory = lazy(() => import("./steps-pinned"))
const STEPS = ["find", "ask", "return"] as const
type Step = (typeof STEPS)[number]

const QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)"
function usePinned() {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(QUERY)
      mql.addEventListener("change", cb)
      return () => mql.removeEventListener("change", cb)
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

/**
 * "How it works" as scroll-driven storytelling. Desktop (motion allowed) loads
 * the pinned, scroll-scrubbed version; phones and reduced motion get a calm
 * stacked list with each vignette in its finished state and no animation library.
 */
export function Steps() {
  const pinned = usePinned()
  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="scroll-mt-24">
      {pinned ? (
        <Suspense fallback={<StackedStory />}>
          <PinnedStory />
        </Suspense>
      ) : (
        <StackedStory />
      )}
    </section>
  )
}

/* Static, finished-state vignettes for the stacked layout. */
function FindStatic() {
  const t = useTranslations("home.steps.demo")
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl bg-ivory px-4 py-3.5 shadow-lift">
        <Search className="size-[1.125rem] text-forest" aria-hidden="true" />
        <span className="text-body text-charcoal">{t("query")}</span>
      </div>
      {(["r0", "r1", "r2"] as const).map((k, i) => (
        <div key={k} className="flex items-center gap-3 rounded-2xl bg-ivory/95 px-4 py-3">
          <span className="size-9 shrink-0 rounded-lg bg-sage" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-caption font-medium text-charcoal">{t(`results.${k}`)}</span>
            <span className="flex items-center gap-1 text-meta text-ink-soft">
              <MapPin className="size-3" aria-hidden="true" />
              {["0.8", "1.4", "2.1"][i]} km
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
function AskStatic() {
  const t = useTranslations("home.steps.demo")
  return (
    <div className="rounded-3xl bg-ivory p-5 shadow-lift">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
        <CalendarDays className="size-5 text-forest" aria-hidden="true" />
        <span className="font-display text-[1.25rem] text-charcoal">{t("dates")}</span>
      </div>
      <p className="mt-3 flex items-center gap-3 px-1 text-caption text-charcoal">
        <span className="flex size-5 items-center justify-center rounded-md bg-forest">
          <Check className="size-3.5 text-ivory" strokeWidth={3} aria-hidden="true" />
        </span>
        {t("terms")}
      </p>
      <p className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-sage text-caption font-medium text-forest">
        <Check className="size-4" aria-hidden="true" />
        {t("sent")}
      </p>
    </div>
  )
}
function ReturnStatic() {
  const t = useTranslations("home.steps.demo")
  return (
    <div className="space-y-3">
      <p className="inline-flex items-center gap-2 rounded-full bg-ochre px-3.5 py-1.5 text-meta font-semibold text-charcoal">
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
        {t("approved")}
      </p>
      <div className="flex items-center gap-3 rounded-2xl bg-ivory px-4 py-3.5 shadow-lift">
        <span className="flex size-10 items-center justify-center rounded-full bg-forest text-ivory">
          <Phone className="size-4" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-meta text-ink-soft">{t("phoneLabel")}</span>
          <span className="block font-medium tracking-wide text-charcoal tabular-nums">+998 90 123 45 67</span>
        </span>
      </div>
      <div className="rounded-2xl bg-ivory/95 px-4 py-3.5">
        <span className="block text-caption font-medium text-forest">{t("returned")}</span>
        <span className="mt-1 flex items-center justify-between">
          <span className="text-meta text-ink-soft">{t("rate")}</span>
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className="size-5 fill-ochre text-ochre" />
            ))}
          </span>
        </span>
      </div>
    </div>
  )
}

function StackedStory() {
  const t = useTranslations("home.steps")
  const format = useFormatter()
  const vignettes: Record<Step, React.ReactNode> = {
    find: <FindStatic />,
    ask: <AskStatic />,
    return: <ReturnStatic />,
  }
  return (
    <div className="container-qadr py-20">
      <RevealText as="h2" id="steps-title" text={t("title")} className="text-title text-charcoal" />
      <Reveal as="ol" stagger className="mt-12 space-y-14">
        {STEPS.map((s, i) => (
          <RevealItem as="li" key={s}>
            <div className="flex items-baseline gap-4 border-t border-charcoal/80 pt-5">
              <span aria-hidden="true" className="font-display text-[3.5rem] leading-[0.8] text-forest">
                {format.number(i + 1)}
              </span>
              <h3 className="text-[1.5rem] leading-tight text-charcoal">{t(`${s}.title`)}</h3>
            </div>
            <p className="mt-3 max-w-[36ch] text-body text-ink-soft">{t(`${s}.body`)}</p>
            <div className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-forest p-5">
              <GirihPattern className="absolute inset-0 h-full w-full text-ivory opacity-[0.07]" size={64} />
              <div className="relative">{vignettes[s]}</div>
            </div>
          </RevealItem>
        ))}
      </Reveal>
    </div>
  )
}
