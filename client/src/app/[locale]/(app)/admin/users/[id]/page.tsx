import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"
import { Party } from "@/features/admin/party"
import type { AdminUserDetail } from "@/features/admin/types"
import { Card, Pill } from "@/features/admin/ui"
import { UserActions } from "@/features/admin/user-actions"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/features/admin/guard"
import { apiOrNull } from "@/lib/api/server"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.nav")
  return { title: t("users") }
}

export default async function AdminUserPage({ params }: PageProps<"/[locale]/admin/users/[id]">) {
  await requireAdmin()
  const { id } = await params
  const data = UUID.test(id) ? await apiOrNull<AdminUserDetail>(`/admin/users/${id}`) : null
  if (!data) notFound()
  const t = await getTranslations("admin")
  const tb = await getTranslations("borrowing.status")
  const format = await getFormatter()
  const u = data.user
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "Asia/Tashkent" })

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-caption text-ink-soft hover:text-forest">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("nav.users")}
      </Link>
      <div className="grid gap-6 *:min-w-0 xl:grid-cols-[22rem_1fr]">
        <div className="space-y-4">
          <Party user={u} role={t("user.profile")} />
          {u.restriction_reason && u.restricted_until ? <p className="rounded-xl bg-ochre/15 px-3 py-2 text-meta text-charcoal">{u.restriction_reason}</p> : null}
          {u.ban_reason && u.banned_at ? <p className="rounded-xl bg-destructive/10 px-3 py-2 text-meta text-destructive">{u.ban_reason}</p> : null}
          {u.is_admin ? <p className="text-meta text-ink-soft">{t("user.adminProtected")}</p> : <UserActions user={u} />}
        </div>
        <div className="space-y-6">
          <Card title={t("user.reports")}>
            {data.reports.length ? (
              <ul className="divide-y divide-line">
                {data.reports.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/reports/${r.id}`} className="flex flex-wrap items-center gap-2 py-2.5 text-caption hover:text-forest">
                      <span className="flex-1">
                        {t(`reasons.${r.reason as "fraud"}`)} · {t(`roles.${r.reporter.id === u.id ? "reporter" : "target"}`)}
                        {r.listing?.title ? <span className="text-ink-soft"> · {r.listing.title}</span> : null}
                      </span>
                      <Pill tone={r.status}>{t(`status.${r.status}`)}</Pill>
                      <span className="text-meta text-ink-soft">{when(r.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-caption text-ink-soft">{t("report.noPast")}</p>}
          </Card>
          <div className="grid gap-6 *:min-w-0 lg:grid-cols-2">
            <Card title={t("user.listings")}>
              {data.listings.length ? (
                <ul className="space-y-2">
                  {data.listings.map((l) => (
                    <li key={l.id} className="flex items-center gap-2 text-caption">
                      <Link href={`/items/${l.id}`} className="min-w-0 flex-1 truncate hover:text-forest">{l.title}</Link>
                      <Pill tone={l.status}>{t(`listingStatus.${l.status as "active"}`)}</Pill>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-caption text-ink-soft">—</p>}
            </Card>
            <Card title={t("user.loans")}>
              {data.loans.length ? (
                <ul className="space-y-2">
                  {data.loans.map((l) => (
                    <li key={l.id} className="text-caption">
                      <span className="text-charcoal">{l.title}</span>
                      <span className="block text-meta text-ink-soft">{t(`roles.${l.role as "owner"}`)} · {l.start} → {l.end} · {tb(l.status as "active")}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-caption text-ink-soft">—</p>}
            </Card>
          </div>
          <div className="grid gap-6 *:min-w-0 lg:grid-cols-2">
            <Card title={t("user.warningsTitle")}>
              {data.warnings.length ? (
                <ul className="space-y-2">
                  {data.warnings.map((w, i) => (
                    <li key={i} className="text-caption"><span className="text-charcoal">{w.reason}</span><span className="block text-meta text-ink-soft">{w.admin} · {when(w.created_at)}</span></li>
                  ))}
                </ul>
              ) : <p className="text-caption text-ink-soft">—</p>}
            </Card>
            <Card title={t("report.trail")}>
              {data.audit.length ? (
                <ul className="space-y-2">
                  {data.audit.map((a, i) => (
                    <li key={i} className="text-caption">
                      <span className="text-charcoal">{t.has(`auditActions.${a.action}` as "auditActions.add_note") ? t(`auditActions.${a.action as "add_note"}`) : a.action}</span>
                      <span className="block text-meta text-ink-soft">{a.admin} · {when(a.created_at)}{a.reason ? ` · ${a.reason}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-caption text-ink-soft">{t("report.noTrail")}</p>}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
