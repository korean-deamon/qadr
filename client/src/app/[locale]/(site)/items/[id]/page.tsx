import { ClientMessages } from "@/components/i18n/client-messages"
import { ChevronRight, MapPin } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"
import { GirihPattern } from "@/components/branding/motifs"
import { ListingCard } from "@/components/listings/listing-card"
import { PageTransition } from "@/components/motion/page-transition"
import { Reveal } from "@/components/motion/reveal"
import { RevealItem } from "@/components/motion/reveal-item"
import { RevealText } from "@/components/motion/reveal-text"
import { Gallery } from "@/features/item/gallery"
import { MobileRequestBar } from "@/features/item/mobile-request-bar"
import { OwnerCard } from "@/features/item/owner-card"
import { RequestPanel } from "@/features/item/request-panel"
import { Link } from "@/i18n/navigation"
import { alternatesFor } from "@/lib/i18n/alternates"
import { cardOf, listingById, listings, MOCK_NOW, ownerOf } from "@/lib/mock"

export function generateStaticParams() {
  return listings.map((l) => ({ id: l.id }))
}

export async function generateMetadata({ params }: PageProps<"/[locale]/items/[id]">): Promise<Metadata> {
  const { id } = await params
  const listing = listingById(id)
  return listing ? { title: listing.title, description: listing.description.slice(0, 160), alternates: alternatesFor(`/items/${id}`) } : {}
}

const offset = (d: number) => new Date(MOCK_NOW.getTime() + d * 86_400_000)

export default async function ItemPage({ params }: PageProps<"/[locale]/items/[id]">) {
  const { id } = await params
  const listing = listingById(id)
  if (!listing) notFound()

  const t = await getTranslations()
  const format = await getFormatter()
  const owner = ownerOf(listing)
  const similar = listings
    .filter((l) => l.id !== listing.id && (l.category === listing.category || l.area === listing.area))
    .concat(listings.filter((l) => l.id !== listing.id))
    .filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i)
    .slice(0, 4)

  return (
    <PageTransition>
      <article className="container-qadr pt-6 pb-32 md:pt-10 md:pb-24">
        <nav aria-label={t("common.breadcrumb")} className="text-meta text-ink-soft">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/explore" className="hover:text-forest">{t("navigation.explore")}</Link></li>
            <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
            <li>
              <Link href={{ pathname: "/explore", query: { category: listing.category } }} className="hover:text-forest">
                {t(`home.categories.items.${listing.category}`)}
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
            <li aria-current="page" className="max-w-[24ch] truncate text-charcoal">{listing.title}</li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <Gallery id={listing.id} title={listing.title} images={listing.images} />

            <header className="mt-10">
              <div className="flex flex-wrap items-center gap-2 text-meta">
                <span className="rounded-full bg-sage px-2.5 py-1 font-medium text-forest">{t(`listings.condition.${listing.condition}`)}</span>
                <span className="rounded-full bg-sage px-2.5 py-1 font-medium text-forest">{t("listings.upToDays", { days: listing.maxDays })}</span>
                <span className="ml-1 text-ink-soft">
                  {t("listings.item.listed", { ago: format.relativeTime(offset(-listing.listedDaysAgo), MOCK_NOW) })}
                </span>
              </div>
              <RevealText as="h1" trigger="load" text={listing.title} className="mt-4 text-title text-charcoal" />
              <p className="mt-3 flex items-center gap-1.5 text-caption text-ink-soft">
                <MapPin className="size-4" aria-hidden="true" />
                {listing.area}
                <span aria-hidden="true" className="mx-1 h-3 w-px bg-line" />
                {t("listings.distance", { km: format.number(listing.km, { maximumFractionDigits: 1 }) })}
              </p>
            </header>

            <Reveal className="mt-10 border-t border-line pt-8">
              <h2 className="text-section text-charcoal">{t("listings.item.about")}</h2>
              <p className="mt-4 max-w-[62ch] text-lead text-charcoal/90">{listing.description}</p>
            </Reveal>

            <Reveal className="mt-10 border-t border-line pt-8">
              <h2 className="text-section text-charcoal">{t("listings.item.terms")}</h2>
              {listing.terms.length ? (
                <ul className="mt-5 space-y-3">
                  {listing.terms.map((term) => (
                    <li key={term} className="flex gap-3 text-body text-charcoal">
                      <span aria-hidden="true" className="mt-[0.55em] h-2.5 w-2 shrink-0 bg-ochre [clip-path:url(#qadr-arch)]" />
                      {term}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-body text-ink-soft">{t("listings.item.noTerms")}</p>
              )}
            </Reveal>

            <Reveal className="mt-10 border-t border-line pt-8">
              <h2 className="text-section text-charcoal">{t("listings.item.location")}</h2>
              <div className="relative mt-5 h-56 overflow-hidden rounded-[1.75rem] bg-sage">
                <GirihPattern className="absolute inset-0 h-full w-full text-forest opacity-[0.12]" size={64} />
                <div aria-hidden="true" className="absolute top-1/2 left-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-forest/30 bg-forest/10" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-2 text-caption font-medium text-forest shadow-soft">
                  <MapPin className="mr-1.5 inline size-4" aria-hidden="true" />
                  {listing.area}
                </div>
              </div>
              <p className="mt-3 text-caption text-ink-soft">{t("listings.item.locationNote")}</p>
            </Reveal>
          </div>

          <aside className="lg:col-span-5">
            <div className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]">
              <ClientMessages ns={["validation"]}>
              <RequestPanel
                today={MOCK_NOW}
                booked={listing.booked.map(([a, b]) => [offset(a), offset(b)] as [Date, Date])}
                maxDays={listing.maxDays}
                ownerName={owner.name.split(" ")[0]}
                terms={[]}
              />
              </ClientMessages>
              <OwnerCard owner={owner} />
            </div>
          </aside>
        </div>

        <section aria-labelledby="similar-title" className="mt-24">
          <RevealText as="h2" id="similar-title" text={t("listings.item.similar")} className="text-title text-charcoal" />
          <Reveal as="ul" stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((l) => (
              <RevealItem as="li" key={l.id}>
                <ListingCard listing={cardOf(l)} />
              </RevealItem>
            ))}
          </Reveal>
        </section>
      </article>
      <MobileRequestBar maxDays={listing.maxDays} />
    </PageTransition>
  )
}
