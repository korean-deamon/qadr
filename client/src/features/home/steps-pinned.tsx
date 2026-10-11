"use client"

import { CalendarDays, Check, MapPin, Phone, Search, Star } from "lucide-react"
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react"
import { useFormatter, useTranslations } from "next-intl"
import { useRef, useState } from "react"
import { ArchOutline, GirihPattern } from "@/components/branding/motifs"
import { RevealText } from "@/components/motion/reveal-text"
import { cn } from "@/lib/utils"

const STEPS = ["find", "ask", "return"] as const

/** Desktop scroll-driven "how it works": pinned section, scrubbed vignettes. Lazy-loaded. */
export default function PinnedStory() {
  const t = useTranslations("home.steps")
  const format = useFormatter()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const [active, setActive] = useState(0)

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length * 0.999)))
  })
  const rail = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])

  return (
    <div ref={ref} className="relative h-[330vh]">
      <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
        <div className="container-qadr grid w-full items-center gap-12 pt-[var(--header-height)] lg:grid-cols-12">
          <div className="lg:col-span-6 xl:col-span-5">
            <RevealText as="h2" id="steps-title" text={t("title")} className="text-title text-charcoal" />
            <ol className="relative mt-12 space-y-2 pl-10">
              {/* progress rail */}
              <span aria-hidden="true" className="absolute top-2 bottom-2 left-[0.9rem] w-px bg-line" />
              <motion.span
                aria-hidden="true"
                className="absolute top-2 left-[0.9rem] w-px origin-top bg-forest"
                style={{ height: rail }}
              />
              {STEPS.map((s, i) => {
                const on = i === active
                return (
                  <li key={s} aria-current={on ? "step" : undefined} className="relative py-4">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-[1.35rem] -left-10 flex size-[1.875rem] items-center justify-center rounded-full border font-display text-[0.9375rem] transition-[background-color,color,border-color] duration-500",
                        i <= active ? "border-forest bg-forest text-ivory" : "border-line bg-ivory text-ink-soft",
                      )}
                    >
                      {format.number(i + 1)}
                    </span>
                    <h3
                      className={cn(
                        "text-[1.75rem] leading-tight transition-colors duration-500",
                        on ? "text-charcoal" : "text-ink-soft/70",
                      )}
                    >
                      {t(`${s}.title`)}
                    </h3>
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-700 ease-[var(--ease-qadr)]",
                        on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <p className="max-w-[36ch] overflow-hidden pt-2 text-body text-ink-soft">{t(`${s}.body`)}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="relative mx-auto hidden aspect-[4/5] w-full max-w-[27rem] md:block lg:col-span-6 lg:col-start-7 xl:col-span-5 xl:col-start-8">
            <Stage progress={scrollYProgress} active={active} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Stage({ progress, active }: { progress: MotionValue<number>; active: number }) {
  // local 0→1 progress inside each third
  const p0 = useTransform(progress, [0.02, 0.3], [0, 1], { clamp: true })
  const p1 = useTransform(progress, [0.36, 0.63], [0, 1], { clamp: true })
  const p2 = useTransform(progress, [0.69, 0.96], [0, 1], { clamp: true })
  return (
    <div className="relative h-full">
      <ArchOutline className="-inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] text-forest/30" />
      <div className="relative h-full overflow-hidden bg-forest [clip-path:url(#qadr-arch)]">
        <GirihPattern className="absolute inset-0 h-full w-full text-ivory opacity-[0.07]" size={72} />
        <StageNumeral active={active} />
        <div className="absolute inset-x-6 top-[30%] bottom-8">
          <Scene show={active === 0}><FindVignette p={p0} /></Scene>
          <Scene show={active === 1}><AskVignette p={p1} /></Scene>
          <Scene show={active === 2}><ReturnVignette p={p2} /></Scene>
        </div>
      </div>
    </div>
  )
}

function StageNumeral({ active }: { active: number }) {
  const format = useFormatter()
  return (
    <div aria-hidden="true" className="absolute inset-x-0 top-[9%] flex justify-center">
      {STEPS.map((s, i) => (
        <motion.span
          key={s}
          className="absolute font-display text-[5.5rem] leading-none text-ochre"
          initial={false}
          animate={{ opacity: i === active ? 1 : 0, y: i === active ? 0 : i < active ? -28 : 28 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {format.number(i + 1)}
        </motion.span>
      ))}
    </div>
  )
}

function Scene({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col justify-center"
      initial={false}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 24, filter: "none" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden={!show}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Vignettes. With `p` they scrub with scroll; without, they show their */
/* finished state (mobile, reduced motion).                            */
/* ------------------------------------------------------------------ */

function useStage(p: MotionValue<number> | undefined, from: number, to: number) {
  const fallback = useTransform(() => 1)
  const src = p ?? fallback
  const opacity = useTransform(src, [from, to], [0, 1], { clamp: true })
  const y = useTransform(src, [from, to], [14, 0], { clamp: true })
  return p ? { opacity, y } : undefined
}

function FindVignette({ p }: { p?: MotionValue<number> }) {
  const t = useTranslations("home.steps.demo")
  const query = t("query")
  const fallback = useTransform(() => 1)
  const typed = useTransform(p ?? fallback, [0, 0.35], [0, query.length], { clamp: true })
  const [chars, setChars] = useState(p ? 0 : query.length)
  useMotionValueEvent(typed, "change", (v) => setChars(Math.round(v)))
  const r0 = useStage(p, 0.4, 0.55)
  const r1 = useStage(p, 0.52, 0.67)
  const r2 = useStage(p, 0.64, 0.79)
  const rows = [r0, r1, r2]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl bg-ivory px-4 py-3.5 shadow-lift">
        <Search className="size-[1.125rem] text-forest" aria-hidden="true" />
        <span className="text-body text-charcoal">
          {query.slice(0, chars)}
          <span className="ml-px inline-block h-[1.1em] w-px translate-y-[0.15em] animate-pulse bg-forest" />
        </span>
      </div>
      {(["r0", "r1", "r2"] as const).map((k, i) => (
        <motion.div key={k} style={rows[i]} className="flex items-center gap-3 rounded-2xl bg-ivory/95 px-4 py-3">
          <span className="size-9 shrink-0 rounded-lg bg-sage" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-caption font-medium text-charcoal">{t(`results.${k}`)}</span>
            <span className="flex items-center gap-1 text-meta text-ink-soft">
              <MapPin className="size-3" aria-hidden="true" />
              {["0.8", "1.4", "2.1"][i]} km
            </span>
          </span>
        </motion.div>
      ))}
    </div>
  )
}

function AskVignette({ p }: { p?: MotionValue<number> }) {
  const t = useTranslations("home.steps.demo")
  const dates = useStage(p, 0.05, 0.25)
  const terms = useStage(p, 0.25, 0.45)
  const fallback = useTransform(() => 1)
  const tick = useTransform(p ?? fallback, [0.42, 0.52], [0, 1], { clamp: true })
  const sent = useTransform(p ?? fallback, [0.62, 0.8], [0, 1], { clamp: true })
  const sendLabel = useTransform(sent, (v) => (v > 0.5 ? 1 : 0))
  const [isSent, setIsSent] = useState(!p)
  useMotionValueEvent(sendLabel, "change", (v) => setIsSent(v === 1))

  return (
    <div className="rounded-3xl bg-ivory p-5 shadow-lift">
      <motion.div style={dates} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
        <CalendarDays className="size-5 text-forest" aria-hidden="true" />
        <span className="font-display text-[1.25rem] text-charcoal">{t("dates")}</span>
      </motion.div>
      <motion.label style={terms} className="mt-3 flex items-center gap-3 px-1 text-caption text-charcoal">
        <span className="relative flex size-5 items-center justify-center rounded-md border border-forest">
          <motion.span style={{ scale: tick, opacity: tick }} className="absolute inset-0 flex items-center justify-center rounded-[5px] bg-forest">
            <Check className="size-3.5 text-ivory" strokeWidth={3} aria-hidden="true" />
          </motion.span>
        </span>
        {t("terms")}
      </motion.label>
      <div
        className={cn(
          "mt-5 flex h-12 items-center justify-center gap-2 rounded-full text-caption font-medium transition-colors duration-500",
          isSent ? "bg-sage text-forest" : "bg-forest text-ivory",
        )}
      >
        {isSent ? <Check className="size-4" aria-hidden="true" /> : null}
        {isSent ? t("sent") : t("send")}
      </div>
    </div>
  )
}

function ReturnVignette({ p }: { p?: MotionValue<number> }) {
  const t = useTranslations("home.steps.demo")
  const approved = useStage(p, 0.02, 0.2)
  const phone = useStage(p, 0.22, 0.42)
  const returned = useStage(p, 0.45, 0.6)
  const fallback = useTransform(() => 1)
  const stars = useTransform(p ?? fallback, [0.62, 0.95], [0, 5], { clamp: true })
  const [filled, setFilled] = useState(p ? 0 : 5)
  useMotionValueEvent(stars, "change", (v) => setFilled(Math.round(v)))

  return (
    <div className="space-y-3">
      <motion.div style={approved} className="inline-flex items-center gap-2 rounded-full bg-ochre px-3.5 py-1.5 text-meta font-semibold text-charcoal">
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
        {t("approved")}
      </motion.div>
      <motion.div style={phone} className="flex items-center gap-3 rounded-2xl bg-ivory px-4 py-3.5 shadow-lift">
        <span className="flex size-10 items-center justify-center rounded-full bg-forest text-ivory">
          <Phone className="size-4" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-meta text-ink-soft">{t("phoneLabel")}</span>
          <span className="block font-medium tracking-wide text-charcoal tabular-nums">+998 90 123 45 67</span>
        </span>
      </motion.div>
      <motion.div style={returned} className="rounded-2xl bg-ivory/95 px-4 py-3.5">
        <span className="block text-caption font-medium text-forest">{t("returned")}</span>
        <span className="mt-1 flex items-center justify-between">
          <span className="text-meta text-ink-soft">{t("rate")}</span>
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn("size-5 transition-[color,fill,transform] duration-300", i < filled ? "scale-110 fill-ochre text-ochre" : "text-line")}
              />
            ))}
          </span>
        </span>
      </motion.div>
    </div>
  )
}

