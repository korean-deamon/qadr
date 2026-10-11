import { ImageOff, MapPin, Star } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { ViewTransition } from "react"
import { Tilt } from "@/components/motion/tilt"
import { MediaImage } from "@/components/ui/media-image"
import { Link } from "@/i18n/navigation"
import type { ListingCardData } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { SaveButton } from "./save-button"

type Props = {
  listing: ListingCardData
  featured?: boolean
  className?: string
  sizes?: string
  /** Above-the-fold cards: load eagerly with high priority (LCP) */
  priority?: boolean
  /** Owner's own list: no save button */
  hideSave?: boolean
}

export function ListingCard({ listing, featured, className, sizes, priority, hideSave }: Props) {
  const t = useTranslations("listings")
  const common = useTranslations("common")
  const format = useFormatter()

  return (
    <Tilt className={className}>
      <article
        className={cn(
          "group relative flex h-full flex-col rounded-2xl border border-line bg-white p-2.5 transition-[box-shadow,border-color] duration-500 ease-[var(--ease-qadr)] hover:border-forest/25 hover:shadow-lift",
        )}
      >
        <ViewTransition name={`listing-photo-${listing.id}`} share="morph" default="none">
          <div className={cn("relative overflow-hidden rounded-xl bg-sage", featured ? "aspect-[4/3] md:aspect-auto md:flex-1" : "aspect-[4/3]")}>
            {listing.image ? (
              <MediaImage
                src={listing.image.url}
                alt={listing.title}
                fill
                loading={priority ? "eager" : undefined}
                fetchPriority={priority ? "high" : undefined}
                sizes={sizes ?? "(min-width: 1024px) 22vw, (min-width: 768px) 45vw, 80vw"}
                className="object-cover transition-transform duration-[900ms] ease-[var(--ease-qadr)] group-hover:scale-[1.04]"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-ink-soft">
                <ImageOff className="size-6" aria-hidden="true" />
              </span>
            )}
            {hideSave ? null : <SaveButton className="absolute top-2.5 right-2.5 z-30" listingId={listing.id} initialSaved={listing.is_saved} title={listing.title} />}
          </div>
        </ViewTransition>
        <div className="flex flex-col gap-2 px-1.5 pt-3.5 pb-1.5">
          <div className="flex items-center gap-1.5 text-meta text-ink-soft">
            <MapPin className="size-3.5" aria-hidden="true" />
            <span>{listing.area}</span>
            {listing.distance_km !== null ? (
              <>
                <span aria-hidden="true" className="mx-0.5 h-3 w-px bg-line" />
                <span>{t("distance", { km: format.number(listing.distance_km, { maximumFractionDigits: 1 }) })}</span>
              </>
            ) : null}
          </div>
          <h3 className={cn("font-display leading-tight text-charcoal", featured ? "text-[1.75rem]" : "text-[1.1875rem]")}>
            <Link
              href={`/items/${listing.id}`}
              className="decoration-forest/40 underline-offset-4 after:absolute after:inset-0 after:rounded-2xl group-hover:underline"
            >
              {listing.title}
            </Link>
          </h3>
          <div className="mt-auto flex items-center justify-between gap-3 pt-1 text-meta">
            <span className="rounded-full bg-sage px-2.5 py-1 font-medium text-forest">{t("upToDays", { days: listing.max_days })}</span>
            <span className="flex items-center gap-1.5 text-ink-soft">
              {t("lentBy", { name: listing.owner.first_name })}
              {listing.owner.rating !== null ? (
                <span role="img" className="flex items-center gap-0.5 font-medium text-charcoal" aria-label={common("rating", { rating: listing.owner.rating })}>
                  <Star className="size-3.5 fill-ochre text-ochre" aria-hidden="true" />
                  <span aria-hidden="true">{format.number(listing.owner.rating, { minimumFractionDigits: 1 })}</span>
                </span>
              ) : (
                <span className="rounded-full bg-ochre/20 px-2 py-0.5 font-medium text-charcoal">{t("newLender")}</span>
              )}
            </span>
          </div>
        </div>
      </article>
    </Tilt>
  )
}
