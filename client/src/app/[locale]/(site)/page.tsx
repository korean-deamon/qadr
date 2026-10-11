import { getLocale } from "next-intl/server"
import { apiServer, getLocation } from "@/lib/api/server"
import type { Category, ListingCardData, Paged } from "@/lib/api/types"
import type { Metadata } from "next"
import { alternatesFor } from "@/lib/i18n/alternates"
import { ClientMessages } from "@/components/i18n/client-messages"
import { PageTransition } from "@/components/motion/page-transition"
import { CategoryIndex } from "@/features/home/category-index"
import { Cta } from "@/features/home/cta"
import { Hero } from "@/features/home/hero"
import { Nearby } from "@/features/home/nearby"
import { Steps } from "@/features/home/steps"
import { Trust } from "@/features/home/trust"

export const metadata: Metadata = { alternates: alternatesFor("/") }

export default async function HomePage() {
  const locale = await getLocale()
  const loc = await getLocation()
  const [categories, nearby] = await Promise.all([
    apiServer<Category[]>(`/categories?locale=${locale}`),
    apiServer<Paged<ListingCardData>>(
      `/listings?page_size=5&sort=${loc ? `nearest&lat=${loc.lat}&lng=${loc.lng}` : "newest"}`,
    ),
  ])
  return (
    <PageTransition>
      <div>
        <Hero />
        <CategoryIndex categories={categories} />
        <Nearby listings={nearby.items} located={Boolean(loc)} />
        <ClientMessages ns={["home.steps"]}>
          <Steps />
        </ClientMessages>
        <Trust />
        <Cta />
      </div>
    </PageTransition>
  )
}
