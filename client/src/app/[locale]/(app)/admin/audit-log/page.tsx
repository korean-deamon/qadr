import type { Metadata } from "next"
import { getFormatter, getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import type { AuditEntry } from "@/features/admin/types"
import { AdminHeader, FilterBar, inputClass, Labeled, Pager, qs, selectClass } from "@/features/admin/ui"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/features/admin/guard"
import { apiServer } from "@/lib/api/server"

const SIZE = 50

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.nav")
  return { title: t("audit") }
}

function targetHref(e: AuditEntry): string | null {
  if (!e.target_id) return null
  if (e.target_type === "user") return `/admin/users/${e.target_id}`
  if (e.target_type === "listing") return `/items/${e.target_id}`
  if (e.target_type === "report") return `/admin/reports/${e.target_id}`
  return e.report_id ? `/admin/reports/${e.report_id}` : null
}

export default async function AuditLogPage({ searchParams }: PageProps<"/[locale]/admin/audit-log">) {
  await requireAdmin()
  const sp = await searchParams
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined)
  const f = {
    action: one("action"),
    target_type: one("target_type"),
    admin_id: one("admin_id"),
    target_id: one("target_id"),
    date_from: one("date_from"),
    date_to: one("date_to"),
    page: Number(one("page") ?? 1) || 1,
  }
  const t = await getTranslations("admin")
  const format = await getFormatter()
  const data = await apiServer<{ items: AuditEntry[]; total: number; actions: string[] }>(`/admin/audit-log${qs({ ...f, page_size: SIZE })}`)
  const label = (a: string) => (t.has(`auditActions.${a}` as "auditActions.add_note") ? t(`auditActions.${a as "add_note"}`) : a)

  return (
    <>
      <AdminHeader title={t("audit.title")} lead={t("audit.lead")} />
      <FilterBar reset={{ href: "/admin/audit-log", label: t("filters.reset") }}>
        <Labeled label={t("filters.action")}>
          <select name="action" defaultValue={f.action ?? ""} className={selectClass}>
            <option value="">{t("filters.any")}</option>
            {data.actions.map((a) => <option key={a} value={a}>{label(a)}</option>)}
          </select>
        </Labeled>
        <Labeled label={t("filters.target")}>
          <select name="target_type" defaultValue={f.target_type ?? ""} className={selectClass}>
            <option value="">{t("filters.any")}</option>
            {(["user", "listing", "report", "conversation"] as const).map((x) => <option key={x} value={x}>{t(`targets.${x}`)}</option>)}
          </select>
        </Labeled>
        <Labeled label={t("filters.from")}>
          <input type="date" name="date_from" defaultValue={f.date_from} className={inputClass} />
        </Labeled>
        <Labeled label={t("filters.to")}>
          <input type="date" name="date_to" defaultValue={f.date_to} className={inputClass} />
        </Labeled>
        {f.admin_id ? <input type="hidden" name="admin_id" value={f.admin_id} /> : null}
        {f.target_id ? <input type="hidden" name="target_id" value={f.target_id} /> : null}
        <Button type="submit" size="sm" className="h-10">{t("filters.apply")}</Button>
      </FilterBar>
      {data.items.length === 0 ? (
        <p className="rounded-[1.5rem] border border-dashed border-line px-6 py-12 text-center text-caption text-ink-soft">{t("audit.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-[1.5rem] border border-line bg-white" data-lenis-prevent-horizontal>
          <table className="w-full min-w-[56rem] text-left text-caption">
            <thead className="border-b border-line text-meta text-ink-soft">
              <tr>
                {(["time", "admin", "action", "target", "reason", "ip"] as const).map((c) => (
                  <th key={c} scope="col" className="px-4 py-3 font-medium">{t(`audit.columns.${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {data.items.map((e) => {
                const href = targetHref(e)
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft tabular-nums">
                      {format.dateTime(new Date(e.created_at), { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Tashkent" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/audit-log${qs({ admin_id: e.admin.id })}`} className="hover:text-forest">{e.admin.name}</Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-charcoal">{label(e.action)}</td>
                    <td className="px-4 py-3">
                      {href ? <Link href={href} className="text-forest hover:underline">{t(`targets.${e.target_type as "user"}`)}</Link> : t(`targets.${e.target_type as "user"}`)}
                      {Object.keys(e.meta ?? {}).length ? (
                        <span className="mt-0.5 block max-w-[18rem] truncate text-meta text-ink-soft" title={JSON.stringify(e.meta)}>{JSON.stringify(e.meta)}</span>
                      ) : null}
                    </td>
                    <td className="max-w-[20rem] px-4 py-3 text-charcoal">{e.reason ?? "—"}</td>
                    <td className="px-4 py-3 text-meta text-ink-soft" title={e.user_agent ?? undefined}>{e.ip ?? "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={f.page} total={data.total} size={SIZE} href={(p) => `/admin/audit-log${qs({ ...f, page: p })}`} label={t("pagination")} />
    </>
  )
}
