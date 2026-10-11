import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { ListingCard } from "@/components/listings/listing-card"
import { Reveal } from "@/components/motion/reveal"
import { RevealItem } from "@/components/motion/reveal-item"
import { Button } from "@/components/ui/button"
import { DashboardShell, EmptyState } from "@/features/dashboard/shell"
import { Link } from "@/i18n/navigation"
import { apiServer } from "@/lib/api/server"
import type { ListingCardData } from "@/lib/api/types"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("saved")
  return { title: t("title") }
}

export default async function SavedPage() {
  const t = await getTranslations("saved")
  const items = await apiServer<ListingCardData[]>("/saved")
  return (
    <DashboardShell title={t("title")} lead={t("lead")}>
      {items.length === 0 ? (
        <EmptyState
          title={t("empty")}
          body={t("emptyBody")}
          action={
            <Button asChild variant="outline">
              <Link href="/explore">{t("emptyAction")}</Link>
            </Button>
          }
        />
      ) : (
        <Reveal as="ul" stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((l) => (
            <RevealItem as="li" key={l.id}>
              <ListingCard listing={l} />
            </RevealItem>
          ))}
        </Reveal>
      )}
    </DashboardShell>
  )
}
