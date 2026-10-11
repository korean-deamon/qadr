import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { PageTransition } from "@/components/motion/page-transition"
import { apiServer } from "@/lib/api/server"
import type { Category } from "@/lib/api/types"
import { alternatesFor } from "@/lib/i18n/alternates"
import { parseSearchParams } from "@/lib/search"
import { ExploreView } from "../../explore/page"

async function category(slug: string): Promise<Category | undefined> {
  const locale = await getLocale()
  return (await apiServer<Category[]>(`/categories?locale=${locale}`)).find((c) => c.slug === slug)
}

export async function generateMetadata({ params }: PageProps<"/[locale]/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const c = await category(slug)
  return c ? { title: c.name, alternates: alternatesFor(`/categories/${slug}`) } : {}
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[locale]/categories/[slug]">) {
  const { slug } = await params
  const c = await category(slug)
  if (!c) notFound()
  const t = await getTranslations("explore")
  const sp = parseSearchParams(await searchParams)
  return (
    <PageTransition>
      <ExploreView params={{ ...sp, category: slug }} heading={{ title: c.name, lead: t("categoryLead", { count: c.count }) }} />
    </PageTransition>
  )
}
