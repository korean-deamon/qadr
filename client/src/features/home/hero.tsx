import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { ArchOutline, GirihPattern } from "@/components/branding/motifs"
import { Parallax } from "@/components/motion/parallax"
import tentView from "../../../public/images/tent-view.jpg"
import { HeroSearch } from "./hero-search"

const delay = (ms: number) => ({ animationDelay: `${ms}ms` })

export async function Hero() {
  const t = await getTranslations("home.hero")

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="container-qadr grid items-center gap-y-12 pt-10 pb-16 md:pt-14 lg:grid-cols-12 lg:gap-x-10 lg:pt-16 lg:pb-24">
        <div className="lg:col-span-7 lg:pr-6">
          <h1
            id="hero-title"
            className="animate-rise max-w-[11ch] text-display text-forest"
            style={delay(60)}
          >
            {t("title")}
          </h1>
          <p className="animate-rise mt-7 max-w-[38ch] text-lead text-ink-soft" style={delay(180)}>
            {t("lead")}
          </p>
          <div className="animate-rise mt-9 max-w-2xl" style={delay(300)}>
            <HeroSearch />
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-[26rem] lg:col-span-5 lg:max-w-none lg:pl-4">
          {/* girih panel sits behind the arch, offset like a ganch wall behind a portal */}
          <div
            aria-hidden="true"
            className="animate-rise absolute top-[10%] -right-[var(--gutter)] -bottom-8 -left-6 lg:-right-[50vw] -z-10 rounded-l-[2rem] bg-sage/70 lg:left-16"
            style={delay(120)}
          >
            <GirihPattern className="h-full w-full text-forest opacity-[0.16]" size={84} />
          </div>
          <div className="relative">
            <Parallax
              distance={40}
              className="animate-unveil relative aspect-[4/5] overflow-hidden [clip-path:url(#qadr-arch)]"
            >
              <Image
                src={tentView}
                alt={t("imageAlt")}
                fill
                priority
                placeholder="blur"
                sizes="(min-width: 1024px) 36vw, (min-width: 640px) 26rem, 90vw"
                className="object-cover object-[50%_62%]"
              />
            </Parallax>
            <ArchOutline className="-inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] text-forest/35" />
          </div>
          <figcaption
            className="animate-rise relative mt-8 flex max-w-xs gap-3 text-caption text-ink-soft lg:ml-2"
            style={delay(520)}
          >
            <span aria-hidden="true" className="mt-[0.7em] h-px w-8 shrink-0 bg-ochre" />
            {t("caption")}
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
