import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { LoanCard } from "@/features/borrowing/loan-card"
import { DashboardShell, EmptyState } from "@/features/dashboard/shell"
import { LinkTabs } from "@/features/dashboard/tabs"
import { Link } from "@/i18n/navigation"
import { apiServer } from "@/lib/api/server"
import type { LoanView } from "@/lib/api/types"
import { todayTashkent } from "@/lib/dates"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("loans")
  return { title: t("title") }
}

export default async function BorrowingsPage({ searchParams }: PageProps<"/[locale]/borrowings">) {
  const sp = await searchParams
  const tab = sp.tab === "lending" ? "lending" : "borrowing"
  const t = await getTranslations("loans")
  const role = tab === "lending" ? "owner" : "borrower"
  const all = await apiServer<LoanView[]>(`/loans?role=${role}&status=all`)
  const today = todayTashkent()
  const open = all.filter((l) => l.status === "approved" || l.status === "active")
  const past = all.filter((l) => l.status === "returned" || l.status === "cancelled").reverse()

  return (
    <DashboardShell title={t("title")} lead={t(`${tab}Lead`)}>
      <LinkTabs
        label={t("title")}
        active={tab}
        tabs={[
          { key: "borrowing", href: "/borrowings", label: t("borrowing") },
          { key: "lending", href: "/borrowings?tab=lending", label: t("lending") },
        ]}
      />
      {all.length === 0 ? (
        <EmptyState
          title={t(`${tab}Empty`)}
          body={t(`${tab}EmptyBody`)}
          action={
            <Button asChild variant="outline">
              <Link href={tab === "lending" ? "/items/new" : "/explore"}>{t(`${tab}EmptyAction`)}</Link>
            </Button>
          }
        />
      ) : null}
      {open.length ? (
        <section>
          <h2 className="mb-4 text-[1.625rem] leading-tight text-charcoal">{t("current")}</h2>
          <ul className="space-y-3">
            {open.map((l) => <LoanCard key={l.id} loan={l} today={today} />)}
          </ul>
        </section>
      ) : null}
      {past.length ? (
        <section>
          <h2 className="mb-4 text-[1.625rem] leading-tight text-charcoal">{t("past")}</h2>
          <ul className="space-y-3">
            {past.map((l) => <LoanCard key={l.id} loan={l} today={today} />)}
          </ul>
        </section>
      ) : null}
    </DashboardShell>
  )
}
