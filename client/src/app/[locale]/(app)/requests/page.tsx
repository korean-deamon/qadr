import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { RequestItem } from "@/features/dashboard/sections"
import { DashboardShell, EmptyState } from "@/features/dashboard/shell"
import { LinkTabs } from "@/features/dashboard/tabs"
import { StatusBadge } from "@/components/borrowing/status-badge"
import { Link } from "@/i18n/navigation"
import { apiServer } from "@/lib/api/server"
import type { BorrowRequestView } from "@/lib/api/types"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("requests")
  return { title: t("title") }
}

export default async function RequestsPage({ searchParams }: PageProps<"/[locale]/requests">) {
  const sp = await searchParams
  const tab = sp.tab === "outgoing" ? "outgoing" : "incoming"
  const t = await getTranslations("requests")
  const [incoming, outgoing] = await Promise.all([
    apiServer<BorrowRequestView[]>("/requests/incoming?status=all"),
    apiServer<BorrowRequestView[]>("/requests/outgoing?status=all"),
  ])
  const list = tab === "incoming" ? incoming : outgoing
  const pending = list.filter((r) => r.status === "pending")
  const past = list.filter((r) => r.status !== "pending")

  return (
    <DashboardShell title={t("title")} lead={t(`${tab}Lead`)}>
      <LinkTabs
        label={t("title")}
        active={tab}
        tabs={[
          { key: "incoming", href: "/requests", label: t("incoming"), count: incoming.filter((r) => r.status === "pending").length },
          { key: "outgoing", href: "/requests?tab=outgoing", label: t("outgoing"), count: outgoing.filter((r) => r.status === "pending").length },
        ]}
      />
      {list.length === 0 ? (
        <EmptyState
          title={t(`${tab}Empty`)}
          body={t(`${tab}EmptyBody`)}
          action={
            <Button asChild variant="outline">
              <Link href={tab === "incoming" ? "/items/new" : "/explore"}>{t(`${tab}EmptyAction`)}</Link>
            </Button>
          }
        />
      ) : null}
      {pending.length ? (
        <section>
          <h2 className="mb-4 text-[1.625rem] leading-tight text-charcoal">{t("pending")}</h2>
          <ul className="space-y-3">
            {pending.map((r) => <RequestItem key={r.id} r={r} />)}
          </ul>
        </section>
      ) : null}
      {past.length ? (
        <section>
          <h2 className="mb-4 text-[1.625rem] leading-tight text-charcoal">{t("history")}</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {past.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
                <Link href={`/items/${r.listing.id}`} className="min-w-0 flex-1 truncate text-caption font-medium text-charcoal hover:text-forest">
                  {r.listing.title}
                </Link>
                <span className="text-meta text-ink-soft">{r.with.name}</span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </DashboardShell>
  )
}
