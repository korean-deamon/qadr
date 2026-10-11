import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { ClientMessages } from "@/components/i18n/client-messages"
import { PageTransition } from "@/components/motion/page-transition"
import { RevealText } from "@/components/motion/reveal-text"
import { CategoryChips } from "@/features/explore/category-chips"
import { FiltersSheet, FiltersSidebar } from "@/features/explore/filters"
import { Results } from "@/features/explore/results"
import { HeroSearch } from "@/features/home/hero-search"
import { apiServer, getLocation } from "@/lib/api/server"
import type { Category, ListingCardData, Paged } from "@/lib/api/types"
import { alternatesFor } from "@/lib/i18n/alternates"
import { parseSearchParams, toApiQuery, type SearchParams } from "@/lib/search"

const PAGE_SIZE = 24

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("explore")
  return { title: t("title"), alternates: alternatesFor("/explore") }
}

export async function ExploreView({ params, heading }: { params: SearchParams; heading?: { title: string; lead?: string } }) {
  const t = await getTranslations("explore")
  const locale = await getLocale()
  const loc = await getLocation()
  const [categories, results] = await Promise.all([
    apiServer<Category[]>(`/categories?locale=${locale}`),
    apiServer<Paged<ListingCardData>>(`/listings?${toApiQuery(params, loc, PAGE_SIZE)}`),
  ])
  const total = categories.reduce((n, c) => n + c.count, 0)
  const active = (params.km && loc ? 1 : 0) + (params.condition?.length ?? 0) + (params.available ? 1 : 0)
  return (
    <ClientMessages ns={["explore", "location"]}>
      <div className="pb-24">
        <section className="border-b border-line">
          <div className="container-qadr pt-10 pb-8 md:pt-14">
            <RevealText as="h1" text={heading?.title ?? t("title")} trigger="load" className="text-title text-forest" />
            <p className="mt-3 text-body text-ink-soft">{heading?.lead ?? t("lead", { count: total })}</p>
            <div className="mt-8 max-w-3xl">
              <HeroSearch compact defaultQuery={params.q} defaultArea={params.area} hidden={{ category: params.category, sort: params.sort }} />
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="lg:hidden">
                <FiltersSheet params={params} active={active} located={Boolean(loc)} />
              </div>
              <div className="min-w-0 flex-1">
                <CategoryChips params={params} categories={categories} />
              </div>
            </div>
          </div>
        </section>

        <div className="container-qadr mt-10 grid gap-10 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-[calc(var(--header-height)+1.5rem)]">
              <FiltersSidebar params={params} located={Boolean(loc)} />
            </div>
          </aside>
          <div className="lg:col-span-9">
            <Results params={params} items={results.items} total={results.total} pageSize={PAGE_SIZE} located={Boolean(loc)} />
          </div>
        </div>
      </div>
    </ClientMessages>
  )
}

export default async function ExplorePage({ searchParams }: PageProps<"/[locale]/explore">) {
  const params = parseSearchParams(await searchParams)
  return (
    <PageTransition>
      <ExploreView params={params} />
    </PageTransition>
  )
}
