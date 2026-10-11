import type { Metadata } from "next"
import { getFormatter, getTranslations } from "next-intl/server"
import { AdminHeader, FilterBar, inputClass, Labeled, Pager, Pill, qs, selectClass } from "@/features/admin/ui"
import type { ReportRow } from "@/features/admin/types"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/features/admin/guard"
import { apiServer } from "@/lib/api/server"

const REASONS = ["not_returned", "damaged", "no_show", "fraud", "inappropriate", "harassment", "spam", "other"] as const
const STATUSES = ["active", "open", "in_review", "resolved", "dismissed", "all"] as const
const SIZE = 25

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.nav")
  return { title: t("reports") }
}

export default async function AdminReports({ searchParams }: PageProps<"/[locale]/admin/reports">) {
  await requireAdmin()
  const sp = await searchParams
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined)
  const f = {
    status: one("status") ?? "active",
    reason: one("reason"),
    priority: one("priority"),
    target_type: one("target_type"),
    assignee: one("assignee"),
    q: one("q"),
    date_from: one("date_from"),
    date_to: one("date_to"),
    page: Number(one("page") ?? 1) || 1,
  }
  const t = await getTranslations("admin")
  const format = await getFormatter()
  const data = await apiServer<{ items: ReportRow[]; total: number }>(`/admin/reports${qs({ ...f, page_size: SIZE })}`)

  return (
    <>
      <AdminHeader title={t("reports.title")} lead={t("reports.lead", { count: data.total })} />
      <FilterBar reset={{ href: "/admin/reports", label: t("filters.reset") }}>
        <Labeled label={t("filters.search")}>
          <input name="q" defaultValue={f.q} placeholder={t("filters.searchReports")} className={`${inputClass} w-56`} />
        </Labeled>
        <Labeled label={t("filters.status")}>
          <select name="status" defaultValue={f.status} className={selectClass}>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
        </Labeled>
        <Labeled label={t("filters.reason")}>
          <select name="reason" defaultValue={f.reason ?? ""} className={selectClass}>
            <option value="">{t("filters.any")}</option>
            {REASONS.map((r) => <option key={r} value={r}>{t(`reasons.${r}`)}</option>)}
          </select>
        </Labeled>
        <Labeled label={t("filters.priority")}>
          <select name="priority" defaultValue={f.priority ?? ""} className={selectClass}>
            <option value="">{t("filters.any")}</option>
            <option value="high">{t("priority.high")}</option>
            <option value="normal">{t("priority.normal")}</option>
          </select>
        </Labeled>
        <Labeled label={t("filters.target")}>
          <select name="target_type" defaultValue={f.target_type ?? ""} className={selectClass}>
            <option value="">{t("filters.any")}</option>
            {(["listing", "user", "message"] as const).map((x) => <option key={x} value={x}>{t(`targets.${x}`)}</option>)}
          </select>
        </Labeled>
        <Labeled label={t("filters.assignee")}>
          <select name="assignee" defaultValue={f.assignee ?? "any"} className={selectClass}>
            {(["any", "me", "unassigned"] as const).map((x) => <option key={x} value={x}>{t(`assignee.${x}`)}</option>)}
          </select>
        </Labeled>
        <Labeled label={t("filters.from")}>
          <input type="date" name="date_from" defaultValue={f.date_from} className={inputClass} />
        </Labeled>
        <Labeled label={t("filters.to")}>
          <input type="date" name="date_to" defaultValue={f.date_to} className={inputClass} />
        </Labeled>
        <Button type="submit" size="sm" className="h-10">{t("filters.apply")}</Button>
      </FilterBar>

      {data.items.length === 0 ? (
        <p className="rounded-[1.5rem] border border-dashed border-line px-6 py-12 text-center text-caption text-ink-soft">{t("reports.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-[1.5rem] border border-line bg-white" data-lenis-prevent-horizontal>
          <table className="w-full min-w-[52rem] text-left text-caption">
            <thead className="border-b border-line text-meta text-ink-soft">
              <tr>
                {(["priority", "reason", "target", "reporter", "age", "status", "assignee"] as const).map((c) => (
                  <th key={c} scope="col" className="px-4 py-3 font-medium">{t(`columns.${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-ivory/60">
                  <td className="px-4 py-3"><Pill tone={r.priority}>{t(`priority.${r.priority}`)}</Pill></td>
                  <td className="px-4 py-3 font-medium text-charcoal">
                    <Link href={`/admin/reports/${r.id}`} className="hover:text-forest hover:underline">{t(`reasons.${r.reason as "fraud"}`)}</Link>
                  </td>
                  <td className="max-w-[16rem] px-4 py-3">
                    <span className="block truncate text-charcoal">{r.listing?.title ?? r.target_user?.name ?? "—"}</span>
                    <span className="text-meta text-ink-soft">{t(`targets.${r.target_type}`)}{r.listing && r.target_user ? ` · ${r.target_user.name}` : ""}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.reporter.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{format.relativeTime(new Date(r.created_at))}</td>
                  <td className="px-4 py-3"><Pill tone={r.status}>{t(`status.${r.status}`)}</Pill></td>
                  <td className="px-4 py-3 text-ink-soft">{r.assigned_admin?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={f.page} total={data.total} size={SIZE} href={(p) => `/admin/reports${qs({ ...f, page: p })}`} label={t("pagination")} />
    </>
  )
}
