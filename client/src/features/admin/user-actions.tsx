import { getTranslations } from "next-intl/server"
import { AdminAction } from "./admin-action"
import type { UserSummary } from "./types"

/** Warn / restrict / ban (and undo) for one user, optionally tied to a report. */
export async function UserActions({ user, reportId }: { user: UserSummary; reportId?: string }) {
  const t = await getTranslations("admin.actions")
  if (user.is_admin) return null
  const base = `/admin/users/${user.id}`
  const name = user.name
  return (
    <div className="flex flex-wrap gap-2">
      <AdminAction endpoint={`${base}/warn`} reportId={reportId} label={t("warn")} title={t("warnTitle", { name })} description={t("notifiedNote")} confirm={t("warn")} done={t("warned")} />
      {user.restricted_until ? (
        <AdminAction endpoint={`${base}/unrestrict`} reportId={reportId} label={t("unrestrict")} title={t("unrestrictTitle", { name })} confirm={t("unrestrict")} done={t("unrestricted")} />
      ) : (
        <AdminAction endpoint={`${base}/restrict`} extra="days" reportId={reportId} label={t("restrict")} title={t("restrictTitle", { name })} description={t("restrictNote")} confirm={t("restrict")} done={t("restricted")} />
      )}
      {user.banned_at ? (
        <AdminAction endpoint={`${base}/unban`} reportId={reportId} label={t("unban")} title={t("unbanTitle", { name })} confirm={t("unban")} done={t("unbanned")} />
      ) : (
        <AdminAction endpoint={`${base}/ban`} variant="destructive" reportId={reportId} label={t("ban")} title={t("banTitle", { name })} description={t("banNote")} confirm={t("ban")} done={t("banned")} />
      )}
    </div>
  )
}

export async function ListingActions({ id, status, reportId }: { id: string; status: string; reportId?: string }) {
  const t = await getTranslations("admin.actions")
  const base = `/admin/listings/${id}`
  if (status === "removed") return null
  return (
    <div className="flex flex-wrap gap-2">
      {status === "hidden_by_admin" ? (
        <AdminAction endpoint={`${base}/unhide`} reportId={reportId} label={t("unhide")} title={t("unhideTitle")} confirm={t("unhide")} done={t("unhidden")} />
      ) : (
        <AdminAction endpoint={`${base}/hide`} reportId={reportId} label={t("hide")} title={t("hideTitle")} description={t("notifiedNote")} confirm={t("hide")} done={t("hidden")} />
      )}
      <AdminAction endpoint={`${base}/remove`} variant="destructive" reportId={reportId} label={t("remove")} title={t("removeTitle")} description={t("removeNote")} confirm={t("remove")} done={t("removed")} />
    </div>
  )
}
