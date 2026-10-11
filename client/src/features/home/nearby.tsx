import { useTranslations } from "next-intl"
import { ListingCard } from "@/components/listings/listing-card"
import { Reveal, RevealItem } from "@/components/motion/reveal"
import { Link } from "@/i18n/navigation"
import { nearby } from "./data"

export function Nearby() {
  const t = useTranslations("home.nearby")
  const [featured, ...rest] = nearby

  return (
    <section aria-labelledby="nearby-title" className="bg-sage/60">
      <div className="container-qadr py-20 lg:py-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            <h2 id="nearby-title" className="text-title text-charcoal">{t("title")}</h2>
            <p className="mt-4 max-w-[46ch] text-body text-ink-soft">{t("lead")}</p>
          </div>
          <Link
            href="/explore"
            className="font-medium text-forest underline decoration-forest/30 underline-offset-[6px] transition-colors hover:decoration-forest"
          >
            {t("viewAll")}
          </Link>
        </Reveal>

        {/* Mobile: swipeable rail. Desktop: editorial grid with one featured item. */}
        <Reveal
          as="ul"
          stagger
          className="-mx-[var(--gutter)] mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 lg:grid-rows-2"
          data-lenis-prevent-horizontal
        >
          <RevealItem as="li" className="w-[80%] shrink-0 snap-start md:w-auto lg:col-span-2 lg:row-span-2">
            <ListingCard listing={featured} featured sizes="(min-width: 1024px) 44vw, (min-width: 768px) 45vw, 80vw" />
          </RevealItem>
          {rest.slice(0, 4).map((l) => (
            <RevealItem as="li" key={l.id} className="w-[80%] shrink-0 snap-start md:w-auto">
              <ListingCard listing={l} />
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
