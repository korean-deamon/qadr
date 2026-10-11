import { ArrowLeft, MessageSquareWarning, StickyNote } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"
import { Thumb } from "@/components/listings/thumb"
import { AdminAction } from "@/features/admin/admin-action"
import { AssignToMe, ConversationViewer } from "@/features/admin/conversation-viewer"
import { Party } from "@/features/admin/party"
import type { ReportDetail } from "@/features/admin/types"
import { Card, Pill } from "@/features/admin/ui"
import { ListingActions, UserActions } from "@/features/admin/user-actions"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/features/admin/guard"
import { apiOrNull } from "@/lib/api/server"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.report")
  return { title: t("title") }
}

export default async function AdminReportPage({ params }: PageProps<"/[locale]/admin/reports/[id]">) {
  await requireAdmin()
  const { id } = await params
  const data = UUID.test(id) ? await apiOrNull<ReportDetail>(`/admin/reports/${id}`) : null
  if (!data) notFound()
  const t = await getTranslations("admin")
  const tb = await getTranslations("borrowing.status")
  const format = await getFormatter()
  const r = data.report
  const closed = r.status === "resolved" || r.status === "dismissed"
  const when = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tashkent" }) : "—")

  return (
    <div className="space-y-6">
      <Link href="/admin/reports" className="inline-flex items-center gap-1.5 text-caption text-ink-soft hover:text-forest">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("nav.reports")}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={r.priority}>{t(`priority.${r.priority}`)}</Pill>
            <Pill tone={r.status}>{t(`status.${r.status}`)}</Pill>
            <span className="text-meta text-ink-soft">{t(`targets.${r.target_type}`)} · {when(r.created_at)}</span>
          </div>
          <h1 className="mt-3 text-title text-charcoal">{t(`reasons.${r.reason as "fraud"}`)}</h1>
          <p className="mt-1 text-caption text-ink-soft">
            {r.assigned_admin ? t("report.assignedTo", { name: r.assigned_admin.name ?? "—" }) : t("report.unassigned")}
          </p>
        </div>
        {closed ? null : (
          <div className="flex flex-wrap gap-2">
            <AssignToMe reportId={r.id} label={t("report.assignMe")} />
            <AdminAction endpoint={`/admin/reports/${r.id}/contact`} extra="to" field="text" label={t("report.contact")} title={t("report.contactTitle")} description={t("report.contactNote")} confirm={t("report.send")} done={t("report.sent")} icon={<MessageSquareWarning aria-hidden="true" />} />
            <AdminAction endpoint={`/admin/reports/${r.id}/dismiss`} variant="ghost" label={t("report.dismiss")} title={t("report.dismissTitle")} confirm={t("report.dismiss")} done={t("report.dismissed")} />
            <AdminAction endpoint={`/admin/reports/${r.id}/resolve`} variant="default" label={t("report.resolve")} title={t("report.resolveTitle")} confirm={t("report.resolve")} done={t("report.resolved")} />
          </div>
        )}
      </header>

      {r.description ? (
        <Card title={t("report.description")}>
          <p className="text-body whitespace-pre-wrap text-charcoal">{r.description}</p>
        </Card>
      ) : null}
      {closed ? (
        <Card title={t("report.outcome")}>
          <p className="text-body text-charcoal">{r.resolution_reason}</p>
          <p className="mt-1 text-meta text-ink-soft">{when(r.resolved_at)}</p>
        </Card>
      ) : null}

      <div className="grid gap-6 *:min-w-0 xl:grid-cols-2">
        <Card title={t("report.parties")}>
          <div className="grid gap-3 *:min-w-0 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {data.reporter ? <Party user={data.reporter} role={t("report.reporter")} /> : null}
            {data.target ? <Party user={data.target} role={t("report.target")} /> : null}
          </div>
          {data.target && !closed ? (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-meta font-medium text-ink-soft">{t("report.actOnTarget", { name: data.target.name })}</p>
              <UserActions user={data.target} reportId={r.id} />
            </div>
          ) : null}
        </Card>

        {data.listing ? (
          <Card title={t("report.listing")}>
            <div className="flex items-center gap-4">
              <Thumb src={data.listing.image} size="lg" />
              <div className="min-w-0">
                <Link href={`/items/${data.listing.id}`} className="block truncate font-display text-[1.25rem] text-charcoal hover:text-forest">{data.listing.title}</Link>
                <Pill tone={data.listing.status} className="mt-1">{t(`listingStatus.${data.listing.status as "active"}`)}</Pill>
                {data.listing.moderation_reason ? <p className="mt-1 text-meta text-ink-soft">{data.listing.moderation_reason}</p> : null}
              </div>
            </div>
            {closed ? null : (
              <div className="mt-4 border-t border-line pt-4">
                <ListingActions id={data.listing.id} status={data.listing.status} reportId={r.id} />
              </div>
            )}
            {data.history.length ? (
              <div className="mt-5">
                <h3 className="text-caption font-semibold text-charcoal">{t("report.history")}</h3>
                <ol className="mt-2 space-y-2 text-meta">
                  {data.history.map((h) => (
                    <li key={h.request_id} className="rounded-xl bg-ivory px-3 py-2">
                      <span className="font-medium text-charcoal">{h.start} → {h.end}</span>
                      <span className="text-ink-soft"> · {t("report.request")}: {tb(h.request_status as "pending")} ({when(h.requested_at)})</span>
                      {h.loan ? (
                        <span className="block text-ink-soft">
                          {t("report.loan")}: {tb(h.loan.status as "active")}
                          {h.loan.picked_up_at ? ` · ${t("report.pickedUp")} ${when(h.loan.picked_up_at)}` : ""}
                          {h.loan.borrower_returned_at ? ` · ${t("report.borrowerReturned")} ${when(h.loan.borrower_returned_at)}` : ""}
                          {h.loan.returned_at ? ` · ${t("report.returned")} ${when(h.loan.returned_at)}` : ""}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>

      <div className="grid gap-6 *:min-w-0 xl:grid-cols-2">
        <Card title={t("conversation.title")}>
          {data.conversation_id ? (
            <ConversationViewer reportId={r.id} ownerId={data.listing?.owner_id ?? null} />
          ) : (
            <p className="text-caption text-ink-soft">{t("conversation.none")}</p>
          )}
        </Card>

        <Card
          title={t("report.notes")}
          action={<AdminAction endpoint={`/admin/reports/${r.id}/notes`} field="body" variant="ghost" label={t("report.addNote")} title={t("report.addNote")} description={t("report.notesNote")} confirm={t("report.saveNote")} done={t("report.noteSaved")} icon={<StickyNote aria-hidden="true" />} />}
        >
          {data.notes.length ? (
            <ul className="space-y-3">
              {data.notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-ochre/10 px-3.5 py-2.5">
                  <p className="text-caption whitespace-pre-wrap text-charcoal">{n.body}</p>
                  <p className="mt-1 text-meta text-ink-soft">{n.admin} · {when(n.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-caption text-ink-soft">{t("report.noNotes")}</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 *:min-w-0 xl:grid-cols-2">
        <Card title={t("report.pastReports")}>
          {(["reporter", "target"] as const).map((side) => (
            <div key={side} className="mb-4 last:mb-0">
              <h3 className="text-meta font-semibold text-ink-soft">{t(`report.${side}`)}</h3>
              {data.past_reports[side].length ? (
                <ul className="mt-1 divide-y divide-line">
                  {data.past_reports[side].map((p) => (
                    <li key={p.id}>
                      <Link href={`/admin/reports/${p.id}`} className="flex items-center gap-2 py-2 text-caption hover:text-forest">
                        <span className="flex-1">{t(`reasons.${p.reason as "fraud"}`)} · {t(`roles.${p.role as "target"}`)}</span>
                        <Pill tone={p.status}>{t(`status.${p.status as "open"}`)}</Pill>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-caption text-ink-soft">{t("report.noPast")}</p>
              )}
            </div>
          ))}
        </Card>
        <Card title={t("report.trail")}>
          {data.audit.length ? (
            <ol className="space-y-2">
              {data.audit.map((a, i) => (
                <li key={i} className="text-caption">
                  <span className="font-medium text-charcoal">{t.has(`auditActions.${a.action}` as "auditActions.add_note") ? t(`auditActions.${a.action as "add_note"}`) : a.action}</span>
                  <span className="text-ink-soft"> · {a.admin} · {when(a.created_at)}</span>
                  {a.reason ? <span className="block text-meta text-ink-soft">{a.reason}</span> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-caption text-ink-soft">{t("report.noTrail")}</p>
          )}
        </Card>
      </div>
    </div>
  )
}
