import { Star } from "lucide-react"
import type { Metadata } from "next"
import { getFormatter, getTranslations } from "next-intl/server"
import { GirihPattern } from "@/components/branding/motifs"
import { RevealText } from "@/components/motion/reveal-text"
import { LoanCard } from "@/features/borrowing/loan-card"
import { Activity, IncomingRequests, MyItems, Section } from "@/features/dashboard/sections"
import { DashboardShell } from "@/features/dashboard/shell"
import { TelegramPrompt } from "@/features/settings/telegram-prompt"
import { apiServer, getMe } from "@/lib/api/server"
import type { BorrowRequestView, ListingCardData, LoanView, NotificationItem, PublicUser } from "@/lib/api/types"
import { todayTashkent } from "@/lib/dates"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("navigation")
  return { title: t("dashboard") }
}

function greetingKey(now = new Date()) {
  const h = (now.getUTCHours() + 5) % 24 // Tashkent
  return h < 5 ? "evening" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"
}

export default async function DashboardPage() {
  const me = (await getMe())!
  const t = await getTranslations("dashboard")
  const format = await getFormatter()
  const [incoming, lending, borrowing, items, activity, profile] = await Promise.all([
    apiServer<BorrowRequestView[]>("/requests/incoming?status=pending"),
    apiServer<LoanView[]>("/loans?role=owner&status=open"),
    apiServer<LoanView[]>("/loans?role=borrower&status=open"),
    apiServer<ListingCardData[]>("/me/listings"),
    apiServer<{ items: NotificationItem[] }>("/notifications?limit=8"),
    apiServer<PublicUser>(`/users/${me.id}`),
  ])
  const today = todayTashkent()
  const first = me.display_name.split(" ")[0]
  const stats = [
    { key: "active", value: format.number(lending.filter((l) => l.status === "active").length + borrowing.filter((l) => l.status === "active").length) },
    { key: "pending", value: format.number(incoming.length) },
    { key: "completed", value: format.number(profile.completed_loans) },
    { key: "rating", value: profile.rating !== null ? format.number(profile.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—", star: profile.rating !== null },
  ]

  return (
    <DashboardShell ns={["notifications", "telegram"]} aside={<Activity items={activity.items} />}>
      <TelegramPrompt />
      <header className="relative isolate overflow-hidden rounded-[1.75rem] bg-forest px-6 py-8 text-ivory md:px-10 md:py-10">
        <GirihPattern className="absolute inset-0 -z-10 h-full w-full text-ivory opacity-[0.07]" size={88} />
        <RevealText as="h1" trigger="load" text={t(`greetings.${greetingKey()}`, { name: first })} className="text-title text-ivory" />
        <p className="mt-3 text-body text-sage">{t("lead")}</p>
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-ivory/15 pt-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.key} className="flex flex-col justify-between">
              <dt className="text-meta text-sage">{t(`stats.${s.key as "active"}`)}</dt>
              <dd className="mt-1 flex items-center gap-2 font-display text-[2.5rem] leading-none tabular-nums">
                {s.value}
                {s.star ? <Star className="size-6 fill-ochre text-ochre" aria-hidden="true" /> : null}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <IncomingRequests requests={incoming} />

      {lending.length ? (
        <Section title={t("sections.lending")} action={{ href: "/borrowings?tab=lending", label: t("seeAll") }}>
          <ul className="space-y-3">
            {lending.map((l) => <LoanCard key={l.id} loan={l} today={today} />)}
          </ul>
        </Section>
      ) : null}

      {borrowing.length ? (
        <Section title={t("sections.borrowing")} action={{ href: "/borrowings", label: t("seeAll") }}>
          <ul className="space-y-3">
            {borrowing.map((l) => <LoanCard key={l.id} loan={l} today={today} />)}
          </ul>
        </Section>
      ) : null}

      <MyItems items={items} />
    </DashboardShell>
  )
}
