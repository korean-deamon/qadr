import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Thumb } from "@/components/listings/thumb"
import { Button } from "@/components/ui/button"
import type { AdminListing } from "@/features/admin/types"
import { AdminHeader, FilterBar, inputClass, Labeled, Pager, Pill, qs, selectClass } from "@/features/admin/ui"
import { ListingActions } from "@/features/admin/user-actions"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/features/admin/guard"
import { apiServer } from "@/lib/api/server"

const SIZE = 25
const STATUSES = ["all", "active", "hidden_by_owner", "hidden_by_admin", "removed"] as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.nav")
  return { title: t("listings") }
}

export default async function AdminListings({ searchParams }: PageProps<"/[locale]/admin/listings">) {
  await requireAdmin()
  const sp = await searchParams
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined)
  const f = { q: one("q"), status: one("status") ?? "all", page: Number(one("page") ?? 1) || 1 }
  const t = await getTranslations("admin")
  const data = await apiServer<{ items: AdminListing[]; total: number }>(`/admin/listings${qs({ ...f, page_size: SIZE })}`)
  return (
    <>
      <AdminHeader title={t("listings.title")} lead={t("listings.lead", { count: data.total })} />
      <FilterBar reset={{ href: "/admin/listings", label: t("filters.reset") }}>
        <Labeled label={t("filters.search")}>
          <input name="q" defaultValue={f.q} placeholder={t("filters.searchListings")} className={`${inputClass} w-64`} />
        </Labeled>
        <Labeled label={t("filters.status")}>
          <select name="status" defaultValue={f.status} className={selectClass}>
            {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? t("filters.any") : t(`listingStatus.${s}`)}</option>)}
          </select>
        </Labeled>
        <Button type="submit" size="sm" className="h-10">{t("filters.apply")}</Button>
      </FilterBar>
      {data.items.length === 0 ? (
        <p className="rounded-[1.5rem] border border-dashed border-line px-6 py-12 text-center text-caption text-ink-soft">{t("listings.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-line bg-white p-3 pr-4">
              <Thumb src={l.image} />
              <div className="min-w-[12rem] flex-1">
                <Link href={`/items/${l.id}`} className="block truncate text-caption font-medium text-charcoal hover:text-forest">{l.title}</Link>
                <p className="text-meta text-ink-soft">
                  <Link href={`/admin/users/${l.owner.id}`} className="hover:text-forest">{l.owner.name}</Link> · {l.area}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Pill tone={l.status}>{t(`listingStatus.${l.status as "active"}`)}</Pill>
                  {l.open_reports ? (
                    <Link href={`/admin/reports${qs({ q: l.title })}`}><Pill tone="open">{t("user.reportsCount", { count: l.open_reports })}</Pill></Link>
                  ) : null}
                </div>
                {l.moderation_reason ? <p className="mt-1 text-meta text-ink-soft">{l.moderation_reason}</p> : null}
              </div>
              <ListingActions id={l.id} status={l.status} />
            </li>
          ))}
        </ul>
      )}
      <Pager page={f.page} total={data.total} size={SIZE} href={(p) => `/admin/listings${qs({ ...f, page: p })}`} label={t("pagination")} />
    </>
  )
}
