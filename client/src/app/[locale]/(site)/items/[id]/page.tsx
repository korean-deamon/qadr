import { ChevronRight, MapPin } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getFormatter, getLocale, getTranslations } from "next-intl/server"
import { cache } from "react"
import { GirihPattern } from "@/components/branding/motifs"
import { ClientMessages } from "@/components/i18n/client-messages"
import { ListingCard } from "@/components/listings/listing-card"
import { PageTransition } from "@/components/motion/page-transition"
import { Reveal } from "@/components/motion/reveal"
import { RevealItem } from "@/components/motion/reveal-item"
import { RevealText } from "@/components/motion/reveal-text"
import { Gallery } from "@/features/item/gallery"
import { MobileRequestBar } from "@/features/item/mobile-request-bar"
import { OwnerCard } from "@/features/item/owner-card"
import { OwnerPanel } from "@/features/item/owner-panel"
import { RequestPanel } from "@/features/item/request-panel"
import { ReportDialog } from "@/features/report/report-dialog"
import { Link } from "@/i18n/navigation"
import { apiOrNull, apiServer, getLocation } from "@/lib/api/server"
import type { ListingCardData, ListingDetail, Paged } from "@/lib/api/types"
import { todayTashkent } from "@/lib/dates"
import { alternatesFor } from "@/lib/i18n/alternates"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const getListing = cache(async (id: string) => {
  if (!UUID.test(id)) return null
  const locale = await getLocale()
  const loc = await getLocation()
  const geo = loc ? `&lat=${loc.lat}&lng=${loc.lng}` : ""
  return apiOrNull<ListingDetail>(`/listings/${id}?locale=${locale}${geo}`)
})

export async function generateMetadata({ params }: PageProps<"/[locale]/items/[id]">): Promise<Metadata> {
  const { id } = await params
  const listing = await getListing(id)
  return listing
    ? { title: listing.title, description: listing.description.slice(0, 160), alternates: alternatesFor(`/items/${id}`) }
    : {}
}

export default async function ItemPage({ params }: PageProps<"/[locale]/items/[id]">) {
  const { id } = await params
  const listing = await getListing(id)
  if (!listing) notFound()

  const t = await getTranslations()
  const format = await getFormatter()
  const loc = await getLocation()
  const geo = loc ? `&lat=${loc.lat}&lng=${loc.lng}` : ""
  const similar = await apiServer<Paged<ListingCardData>>(
    `/listings?page_size=4&exclude=${listing.id}${listing.category.slug ? `&category=${listing.category.slug}` : ""}${geo}`,
  )
  const ownerFirst = listing.owner.first_name

  return (
    <PageTransition>
      <article className="container-qadr pt-6 pb-32 md:pt-10 md:pb-24">
        <nav aria-label={t("common.breadcrumb")} className="text-meta text-ink-soft">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/explore" className="hover:text-forest">{t("navigation.explore")}</Link></li>
            {listing.category.slug ? (
              <>
                <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
                <li>
                  <Link href={`/categories/${listing.category.slug}`} className="hover:text-forest">{listing.category.name}</Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
            <li aria-current="page" className="max-w-[24ch] truncate text-charcoal">{listing.title}</li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ClientMessages ns={["listings"]}>
              <Gallery id={listing.id} title={listing.title} images={listing.images} />
            </ClientMessages>

            <header className="mt-10">
              <div className="flex flex-wrap items-center gap-2 text-meta">
                <span className="rounded-full bg-sage px-2.5 py-1 font-medium text-forest">{t(`listings.condition.${listing.condition}`)}</span>
                <span className="rounded-full bg-sage px-2.5 py-1 font-medium text-forest">{t("listings.upToDays", { days: listing.max_days })}</span>
                {listing.on_loan ? (
                  <span className="rounded-full bg-ochre/20 px-2.5 py-1 font-medium text-charcoal">{t("dashboard.itemStatus.onLoan")}</span>
                ) : null}
                <span className="ml-1 text-ink-soft">
                  {t("listings.item.listed", { ago: format.relativeTime(new Date(listing.created_at)) })}
                </span>
              </div>
              <RevealText as="h1" trigger="load" text={listing.title} className="mt-4 text-title text-charcoal" />
              <p className="mt-3 flex items-center gap-1.5 text-caption text-ink-soft">
                <MapPin className="size-4" aria-hidden="true" />
                {listing.area}
                {listing.distance_km !== null ? (
                  <>
                    <span aria-hidden="true" className="mx-1 h-3 w-px bg-line" />
                    {t("listings.distance", { km: format.number(listing.distance_km, { maximumFractionDigits: 1 }) })}
                  </>
                ) : null}
              </p>
            </header>

            <Reveal className="mt-10 border-t border-line pt-8">
              <h2 className="text-section text-charcoal">{t("listings.item.about")}</h2>
              <p className="mt-4 max-w-[62ch] text-lead whitespace-pre-line text-charcoal/90">{listing.description}</p>
            </Reveal>

            <Reveal className="mt-10 border-t border-line pt-8">
              <h2 className="text-section text-charcoal">{t("listings.item.terms")}</h2>
              {listing.borrowing_terms.length ? (
                <ul className="mt-5 space-y-3">
                  {listing.borrowing_terms.map((term) => (
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
              <ClientMessages ns={["validation", "report"]}>
                {listing.is_owner ? (
                  <OwnerPanel id={listing.id} status={listing.status} moderationReason={listing.moderation_reason} />
                ) : (
                  <RequestPanel
                    listingId={listing.id}
                    today={todayTashkent()}
                    booked={listing.booked}
                    maxDays={listing.max_days}
                    ownerName={ownerFirst}
                    terms={listing.borrowing_terms}
                    myRequest={listing.my_request}
                    conversationId={listing.conversation_id}
                  />
                )}
                <OwnerCard owner={listing.owner} />
                {listing.is_owner ? null : (
                  <div className="flex justify-center">
                    <ReportDialog targetType="listing" targetId={listing.id} />
                  </div>
                )}
              </ClientMessages>
            </div>
          </aside>
        </div>

        {similar.items.length ? (
          <section aria-labelledby="similar-title" className="mt-24">
            <RevealText as="h2" id="similar-title" text={t("listings.item.similar")} className="text-title text-charcoal" />
            <Reveal as="ul" stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.items.map((l) => (
                <RevealItem as="li" key={l.id}>
                  <ListingCard listing={l} />
                </RevealItem>
              ))}
            </Reveal>
          </section>
        ) : null}
      </article>
      {listing.is_owner ? null : <MobileRequestBar maxDays={listing.max_days} />}
    </PageTransition>
  )
}
