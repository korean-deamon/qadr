import { Plus } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Thumb } from "@/components/listings/thumb"
import { Button } from "@/components/ui/button"
import { ItemStatus } from "@/features/dashboard/sections"
import { DashboardShell, EmptyState } from "@/features/dashboard/shell"
import { Link } from "@/i18n/navigation"
import { apiServer } from "@/lib/api/server"
import type { ListingCardData } from "@/lib/api/types"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("myItems")
  return { title: t("title") }
}

export default async function MyItemsPage() {
  const t = await getTranslations()
  const items = await apiServer<ListingCardData[]>("/me/listings")
  const add = (
    <Button asChild>
      <Link href="/items/new">
        <Plus aria-hidden="true" />
        {t("navigation.listItem")}
      </Link>
    </Button>
  )
  return (
    <DashboardShell title={t("myItems.title")} lead={t("myItems.lead")} action={items.length ? add : undefined}>
      {items.length === 0 ? (
        <EmptyState title={t("myItems.empty")} body={t("dashboard.emptyItems")} action={add} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((i) => (
            <li key={i.id} className="flex flex-col rounded-2xl border border-line bg-white p-4">
              <div className="flex gap-4">
                <Thumb src={i.image?.url} size="lg" />
                <div className="min-w-0 flex-1">
                  <Link href={`/items/${i.id}`} className="line-clamp-2 font-display text-[1.1875rem] leading-snug text-charcoal hover:text-forest">
                    {i.title}
                  </Link>
                  <p className="mt-1 text-meta text-ink-soft">{i.area} · {t("listings.upToDays", { days: i.max_days })}</p>
                  <div className="mt-2"><ItemStatus item={i} /></div>
                </div>
              </div>
              {i.status === "hidden_by_admin" && i.moderation_reason ? (
                <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-meta text-destructive">{i.moderation_reason}</p>
              ) : null}
              <div className="mt-4 flex justify-end gap-2">
                {i.pending_requests ? (
                  <Button asChild variant="ghost" size="sm"><Link href="/requests">{t("myItems.viewRequests")}</Link></Button>
                ) : null}
                <Button asChild variant="outline" size="sm"><Link href={`/items/${i.id}/edit`}>{t("listings.owner.edit")}</Link></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  )
}
