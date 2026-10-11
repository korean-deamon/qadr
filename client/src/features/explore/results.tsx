import { useTranslations } from "next-intl"
import { Fragment } from "react"
import { ListingCard } from "@/components/listings/listing-card"
import { Button } from "@/components/ui/button"
import { cardOf } from "@/lib/mock"
import { searchListings, type SearchParams } from "@/lib/mock/search"
import { EmptyState } from "./empty-state"
import { SortTabs } from "./sort-tabs"
import { Spotlight } from "./spotlight"

const PAGE = 12

export function Results({ params }: { params: SearchParams }) {
  const t = useTranslations("explore")
  const all = searchListings(params)
  const shown = all.slice(0, PAGE)
  const withSpotlight = !params.category && !params.q && shown.length > 4

  return (
    <div>
      <h2 className="sr-only">{t("results")}</h2>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-caption text-ink-soft" aria-live="polite">
          {params.q ? <span className="mr-2 font-medium text-charcoal">{t("resultsFor", { q: params.q })}</span> : null}
          {t("showing", { shown: shown.length, total: all.length })}
        </p>
        <SortTabs params={params} />
      </div>

      {all.length === 0 ? (
        <EmptyState query={params.q ?? ""} />
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((l, i) => (
            <Fragment key={l.id}>
              {withSpotlight && i === 4 ? (
                <li className="sm:col-span-2 xl:col-span-1">
                  <Spotlight />
                </li>
              ) : null}
              <li>
                <ListingCard listing={cardOf(l)} priority={i < 3} sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 92vw" />
              </li>
            </Fragment>
          ))}
        </ul>
      )}

      {all.length > PAGE ? (
        <div className="mt-12 flex justify-center">
          <Button variant="outline" size="lg">{t("more")}</Button>
        </div>
      ) : null}
    </div>
  )
}
