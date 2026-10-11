import { AlertTriangle } from "lucide-react"
import { getFormatter, getTranslations } from "next-intl/server"
import { AdminHeader, Card, Pill } from "@/features/admin/ui"
import type { ReportRow, Stats } from "@/features/admin/types"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/features/admin/guard"
import { apiServer } from "@/lib/api/server"

export default async function AdminOverview() {
  await requireAdmin()
  const t = await getTranslations("admin")
  const format = await getFormatter()
  const [stats, queue] = await Promise.all([
    apiServer<Stats>("/admin/stats"),
    apiServer<{ items: ReportRow[] }>("/admin/reports?page_size=6"),
  ])
  const tiles: { key: keyof Stats; href: string; alert?: boolean }[] = [
    { key: "open_reports", href: "/admin/reports" },
    { key: "high_priority", href: "/admin/reports?priority=high", alert: stats.high_priority > 0 },
    { key: "users", href: "/admin/users" },
    { key: "restricted", href: "/admin/users?state=restricted" },
    { key: "banned", href: "/admin/users?state=banned" },
    { key: "listings", href: "/admin/listings?status=active" },
    { key: "hidden_listings", href: "/admin/listings?status=hidden_by_admin" },
    { key: "active_loans", href: "/admin/reports" },
  ]
  return (
    <>
      <AdminHeader title={t("overview.title")} lead={t("overview.lead")} />
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((x) => (
          <Link key={x.key} href={x.href} className={x.alert ? "rounded-[1.5rem] bg-destructive p-5 text-white transition-transform hover:-translate-y-0.5" : "rounded-[1.5rem] border border-line bg-white p-5 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-forest/30"}>
            <dt className={x.alert ? "text-meta text-white/80" : "text-meta text-ink-soft"}>{t(`stats.${x.key}`)}</dt>
            <dd className="mt-2 font-display text-[2.25rem] leading-none tabular-nums">{format.number(stats[x.key])}</dd>
          </Link>
        ))}
      </dl>
      <Card title={t("overview.queue")} className="mt-8" action={<Link href="/admin/reports" className="text-caption font-medium text-forest hover:underline">{t("overview.allReports")}</Link>}>
        {queue.items.length === 0 ? (
          <p className="text-caption text-ink-soft">{t("reports.empty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {queue.items.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/reports/${r.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:text-forest">
                  {r.priority === "high" ? <AlertTriangle className="size-4 text-destructive" aria-label={t("priority.high")} /> : null}
                  <span className="text-caption font-medium">{t(`reasons.${r.reason as "fraud"}`)}</span>
                  <span className="min-w-0 flex-1 truncate text-caption text-ink-soft">
                    {r.listing?.title ?? r.target_user?.name ?? "—"}
                  </span>
                  <Pill tone={r.status}>{t(`status.${r.status}`)}</Pill>
                  <span className="text-meta text-ink-soft">{format.relativeTime(new Date(r.created_at))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
