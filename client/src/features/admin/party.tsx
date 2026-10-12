import { BadgeCheck, Phone, Send, Star } from "lucide-react"
import { getFormatter, getTranslations } from "next-intl/server"
import { Avatar } from "@/components/ui/avatar"
import { Link } from "@/i18n/navigation"
import type { UserSummary } from "./types"
import { Pill } from "./ui"

/** One side of a report with trust signals (SPEC §23). */
export async function Party({ user, role }: { user: UserSummary; role: string }) {
  const t = await getTranslations("admin.user")
  const format = await getFormatter()
  return (
    <div className="rounded-2xl bg-ivory p-4">
      <p className="text-meta font-medium text-ink-soft">{role}</p>
      <Link href={`/admin/users/${user.id}`} className="mt-2 flex items-center gap-3 hover:text-forest">
        <Avatar name={user.name} />
        <span className="min-w-0">
          <span className="block truncate font-display text-[1.25rem] leading-tight">{user.name}</span>
          <span className="block truncate text-meta text-ink-soft">{user.email}</span>
        </span>
      </Link>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {user.is_admin ? <Pill tone="admin">{t("admin")}</Pill> : null}
        {user.banned_at ? <Pill tone="banned">{t("banned")}</Pill> : null}
        {user.restricted_until ? <Pill tone="restricted">{t("restrictedUntil", { date: format.dateTime(new Date(user.restricted_until), { dateStyle: "medium" }) })}</Pill> : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-meta">
        <Row label={t("rating")}>
          {user.rating !== null ? (
            <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-ochre text-ochre" aria-hidden="true" />{user.rating} ({user.rating_count})</span>
          ) : "—"}
        </Row>
        <Row label={t("completed")}>{user.completed_loans}</Row>
        <Row label={t("memberSince")}>{format.dateTime(new Date(user.member_since), { dateStyle: "medium" })}</Row>
        <Row label={t("warnings")}>{user.warnings}</Row>
        <Row label={t("asTarget")}>{user.reports_as_target}</Row>
        <Row label={t("asReporter")}>{user.reports_as_reporter}</Row>
      </dl>
      <ul className="mt-3 flex flex-wrap gap-3 text-meta text-charcoal">
        <li className="flex items-center gap-1"><BadgeCheck className={user.phone_verified ? "size-3.5 text-forest" : "size-3.5 text-line"} aria-hidden="true" />{user.phone_verified ? t("telegramLinked") : t("telegramMissing")}</li>
        <li className="flex items-center gap-1"><Phone className={user.phone_verified ? "size-3.5 text-forest" : "size-3.5 text-line"} aria-hidden="true" />{user.phone ?? t("noPhone")}</li>
        <li className="flex items-center gap-1"><Send className={user.telegram_linked ? "size-3.5 text-forest" : "size-3.5 text-line"} aria-hidden="true" />{user.telegram_linked ? t("telegram") : t("noTelegram")}</li>
      </ul>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-medium text-charcoal">{children}</dd>
    </div>
  )
}
