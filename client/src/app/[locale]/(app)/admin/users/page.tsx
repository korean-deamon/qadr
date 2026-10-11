import type { Metadata } from "next"
import { getFormatter, getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import type { UserSummary } from "@/features/admin/types"
import { AdminHeader, FilterBar, inputClass, Labeled, Pager, Pill, qs, selectClass } from "@/features/admin/ui"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/features/admin/guard"
import { apiServer } from "@/lib/api/server"

const SIZE = 25
const STATES = ["all", "restricted", "banned", "admins", "unverified"] as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.nav")
  return { title: t("users") }
}

export default async function AdminUsers({ searchParams }: PageProps<"/[locale]/admin/users">) {
  await requireAdmin()
  const sp = await searchParams
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined)
  const f = { q: one("q"), state: one("state") ?? "all", page: Number(one("page") ?? 1) || 1 }
  const t = await getTranslations("admin")
  const format = await getFormatter()
  const data = await apiServer<{ items: UserSummary[]; total: number }>(`/admin/users${qs({ ...f, page_size: SIZE })}`)
  return (
    <>
      <AdminHeader title={t("users.title")} lead={t("users.lead", { count: data.total })} />
      <FilterBar reset={{ href: "/admin/users", label: t("filters.reset") }}>
        <Labeled label={t("filters.search")}>
          <input name="q" defaultValue={f.q} placeholder={t("filters.searchUsers")} className={`${inputClass} w-64`} />
        </Labeled>
        <Labeled label={t("filters.state")}>
          <select name="state" defaultValue={f.state} className={selectClass}>
            {STATES.map((s) => <option key={s} value={s}>{t(`userStates.${s}`)}</option>)}
          </select>
        </Labeled>
        <Button type="submit" size="sm" className="h-10">{t("filters.apply")}</Button>
      </FilterBar>
      {data.items.length === 0 ? (
        <p className="rounded-[1.5rem] border border-dashed border-line px-6 py-12 text-center text-caption text-ink-soft">{t("users.empty")}</p>
      ) : (
        <ul className="divide-y divide-line rounded-[1.5rem] border border-line bg-white">
          {data.items.map((u) => (
            <li key={u.id}>
              <Link href={`/admin/users/${u.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-ivory/60">
                <Avatar name={u.name} size="sm" />
                <span className="min-w-[12rem] flex-1">
                  <span className="block text-caption font-medium text-charcoal">{u.name}</span>
                  <span className="block text-meta text-ink-soft">{u.email}</span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {u.is_admin ? <Pill tone="admin">{t("user.admin")}</Pill> : null}
                  {u.banned_at ? <Pill tone="banned">{t("user.banned")}</Pill> : null}
                  {u.restricted_until ? <Pill tone="restricted">{t("user.restricted")}</Pill> : null}
                  {!u.email_verified ? <Pill tone="normal">{t("user.emailUnverified")}</Pill> : null}
                  {u.reports_as_target ? <Pill tone="open">{t("user.reportsCount", { count: u.reports_as_target })}</Pill> : null}
                </span>
                <span className="w-28 text-right text-meta text-ink-soft">{format.dateTime(new Date(u.member_since), { dateStyle: "medium" })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager page={f.page} total={data.total} size={SIZE} href={(p) => `/admin/users${qs({ ...f, page: p })}`} label={t("pagination")} />
    </>
  )
}
