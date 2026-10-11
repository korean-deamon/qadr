import { MapPin, Star } from "lucide-react"
import Image, { type StaticImageData } from "next/image"
import { useFormatter, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { SaveButton } from "./save-button"

export type ListingCardData = {
  id: string
  title: string
  area: string
  km: number
  maxDays: number
  owner: string
  rating: number
  image: StaticImageData | string
}

type Props = {
  listing: ListingCardData
  featured?: boolean
  className?: string
  sizes?: string
}

export function ListingCard({ listing, featured, className, sizes }: Props) {
  const t = useTranslations("listings")
  const common = useTranslations("common")
  const format = useFormatter()

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border border-line bg-white p-2.5 transition-[box-shadow,border-color] duration-500 ease-[var(--ease-qadr)] hover:border-forest/25 hover:shadow-lift",
        className,
      )}
    >
      <div className={cn("relative overflow-hidden rounded-xl bg-sage", featured ? "aspect-[4/3] md:aspect-auto md:flex-1" : "aspect-[4/3]")}>
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          sizes={sizes ?? "(min-width: 1024px) 22vw, (min-width: 768px) 45vw, 80vw"}
          className="object-cover transition-transform duration-[900ms] ease-[var(--ease-qadr)] group-hover:scale-[1.04]"
        />
        <SaveButton className="absolute top-2.5 right-2.5 z-10" />
      </div>
      <div className="flex flex-col gap-2 px-1.5 pt-3.5 pb-1.5">
        <div className="flex items-center gap-1.5 text-meta text-ink-soft">
          <MapPin className="size-3.5" aria-hidden="true" />
          <span>{listing.area}</span>
          <span aria-hidden="true" className="mx-0.5 h-3 w-px bg-line" />
          <span>{t("distance", { km: format.number(listing.km, { maximumFractionDigits: 1 }) })}</span>
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
          <span className="rounded-full bg-sage px-2.5 py-1 font-medium text-forest">
            {t("upToDays", { days: listing.maxDays })}
          </span>
          <span className="flex items-center gap-1.5 text-ink-soft">
            {t("lentBy", { name: listing.owner })}
            <span className="flex items-center gap-0.5 font-medium text-charcoal" aria-label={common("rating", { rating: listing.rating })}>
              <Star className="size-3.5 fill-ochre text-ochre" aria-hidden="true" />
              <span aria-hidden="true">{format.number(listing.rating, { minimumFractionDigits: 1 })}</span>
            </span>
          </span>
        </div>
      </div>
    </article>
  )
}
