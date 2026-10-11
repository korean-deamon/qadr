import { useTranslations } from "next-intl"
import { Fragment } from "react"
import { ListingCard } from "@/components/listings/listing-card"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import type { ListingCardData } from "@/lib/api/types"
import { toQuery, type SearchParams } from "@/lib/search"
import { EmptyState } from "./empty-state"
import { SortTabs } from "./sort-tabs"
import { Spotlight } from "./spotlight"

export function Results({
  params,
  items,
  total,
  pageSize,
  located,
}: {
  params: SearchParams
  items: ListingCardData[]
  total: number
  pageSize: number
  located: boolean
}) {
  const t = useTranslations("explore")
  const page = params.page ?? 1
  const shown = Math.min(total, (page - 1) * pageSize + items.length)
  const withSpotlight = !params.category && !params.q && page === 1 && items.length > 4

  return (
    <div>
      <h2 className="sr-only">{t("results")}</h2>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-caption text-ink-soft" aria-live="polite">
          {params.q ? <span className="mr-2 font-medium text-charcoal">{t("resultsFor", { q: params.q })}</span> : null}
          {t("showing", { shown, total })}
        </p>
        <SortTabs params={params} located={located} />
      </div>

      {items.length === 0 ? (
        <EmptyState query={params.q ?? ""} />
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((l, i) => (
            <Fragment key={l.id}>
              {withSpotlight && i === 4 ? (
                <li className="sm:col-span-2 xl:col-span-1">
                  <Spotlight />
                </li>
              ) : null}
              <li>
                <ListingCard listing={l} priority={page === 1 && i < 3} sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 92vw" />
              </li>
            </Fragment>
          ))}
        </ul>
      )}

      {page > 1 || shown < total ? (
        <nav aria-label={t("pagination")} className="mt-12 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Button asChild variant="ghost" size="lg">
              <Link href={{ pathname: "/explore", query: toQuery({ ...params, page: page - 1 > 1 ? page - 1 : undefined }) }}>{t("previous")}</Link>
            </Button>
          ) : null}
          {shown < total ? (
            <Button asChild variant="outline" size="lg">
              <Link href={{ pathname: "/explore", query: toQuery({ ...params, page: page + 1 }) }}>{t("next")}</Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </div>
  )
}
