import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { ClientMessages } from "@/components/i18n/client-messages"
import { PageTransition } from "@/components/motion/page-transition"
import { RevealText } from "@/components/motion/reveal-text"
import { ListingForm } from "@/features/listing-form/listing-form"
import { apiServer, getMe } from "@/lib/api/server"
import type { Category } from "@/lib/api/types"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("listingForm")
  return { title: t("newTitle") }
}

export default async function NewItemPage() {
  const t = await getTranslations("listingForm")
  const locale = await getLocale()
  const [categories, me] = await Promise.all([apiServer<Category[]>(`/categories?locale=${locale}`), getMe()])
  return (
    <PageTransition>
      <div className="container-qadr max-w-4xl py-10 md:py-14">
        <RevealText as="h1" trigger="load" text={t("newTitle")} className="text-title text-forest" />
        <p className="mt-3 max-w-[60ch] text-body text-ink-soft">{t("newLead")}</p>
        <div className="mt-10">
          <ClientMessages ns={["listingForm", "validation"]}>
            <ListingForm categories={categories} initial={{ location_area: me?.area ?? "" }} />
          </ClientMessages>
        </div>
      </div>
    </PageTransition>
  )
}
