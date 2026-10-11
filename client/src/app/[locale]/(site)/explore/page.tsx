import { ClientMessages } from "@/components/i18n/client-messages"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageTransition } from "@/components/motion/page-transition"
import { RevealText } from "@/components/motion/reveal-text"
import { CategoryChips } from "@/features/explore/category-chips"
import { FiltersSheet, FiltersSidebar } from "@/features/explore/filters"
import { Results } from "@/features/explore/results"
import { HeroSearch } from "@/features/home/hero-search"
import { listings } from "@/lib/mock"
import { alternatesFor } from "@/lib/i18n/alternates"
import { parseSearchParams } from "@/lib/mock/search"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("explore")
  return { title: t("title"), alternates: alternatesFor("/explore") }
}

export default async function ExplorePage({ searchParams }: PageProps<"/[locale]/explore">) {
  const t = await getTranslations("explore")
  const raw = await searchParams
  const p = parseSearchParams(raw)
  const area = typeof raw.area === "string" ? raw.area : undefined
  const active = (p.km ? 1 : 0) + (p.condition?.length ?? 0)
  return (
    <PageTransition>
      <ClientMessages ns={["explore"]}>
      <div className="pb-24">
        <section className="border-b border-line">
          <div className="container-qadr pt-10 pb-8 md:pt-14">
            <RevealText as="h1" text={t("title")} trigger="load" className="text-title text-forest" />
            <p className="mt-3 text-body text-ink-soft">{t("lead", { count: listings.length })}</p>
            <div className="mt-8 max-w-3xl">
              <HeroSearch compact defaultQuery={p.q} defaultArea={area} hidden={{ category: p.category, sort: p.sort }} />
            </div>
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <div className="lg:hidden">
                  <FiltersSheet params={p} active={active} />
                </div>
                <div className="min-w-0 flex-1">
                  <CategoryChips params={p} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container-qadr mt-10 grid gap-10 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-[calc(var(--header-height)+1.5rem)]">
              <FiltersSidebar params={p} />
            </div>
          </aside>
          <div className="lg:col-span-9">
            <Results params={p} />
          </div>
        </div>
      </div>
      </ClientMessages>
    </PageTransition>
  )
}
