import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { ClientMessages } from "@/components/i18n/client-messages"
import { PageTransition } from "@/components/motion/page-transition"
import { RevealText } from "@/components/motion/reveal-text"
import { ListingForm } from "@/features/listing-form/listing-form"
import { apiOrNull, apiServer } from "@/lib/api/server"
import type { Category, ListingDetail } from "@/lib/api/types"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("listingForm")
  return { title: t("editTitle") }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function EditItemPage({ params }: PageProps<"/[locale]/items/[id]/edit">) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const locale = await getLocale()
  const [listing, categories] = await Promise.all([
    apiOrNull<ListingDetail>(`/listings/${id}?locale=${locale}`),
    apiServer<Category[]>(`/categories?locale=${locale}`),
  ])
  // owner-only page; anyone else gets a plain 404 (the API decides ownership)
  if (!listing || !listing.is_owner) notFound()
  const t = await getTranslations("listingForm")
  return (
    <PageTransition>
      <div className="container-qadr max-w-4xl py-10 md:py-14">
        <RevealText as="h1" trigger="load" text={t("editTitle")} className="text-title text-forest" />
        <p className="mt-3 max-w-[60ch] text-body text-ink-soft">{listing.title}</p>
        <div className="mt-10">
          <ClientMessages ns={["listingForm", "validation"]}>
            <ListingForm
              listingId={listing.id}
              categories={categories}
              initialPhotos={listing.images.map((image) => ({ kind: "remote" as const, key: image.id, image }))}
              initial={{
                title: listing.title,
                description: listing.description,
                category: listing.category.slug ?? "",
                condition: listing.condition,
                max_days: listing.max_days,
                borrowing_terms: listing.borrowing_terms,
                location_area: listing.area,
                hasCoords: Boolean(listing.has_coordinates),
              }}
            />
          </ClientMessages>
        </div>
      </div>
    </PageTransition>
  )
}
