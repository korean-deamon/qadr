import { ClientMessages } from "@/components/i18n/client-messages"
import { Star } from "lucide-react"
import type { Metadata } from "next"
import { getFormatter, getTranslations } from "next-intl/server"
import { GirihPattern } from "@/components/branding/motifs"
import { PageTransition } from "@/components/motion/page-transition"
import { RevealText } from "@/components/motion/reveal-text"
import { Avatar } from "@/components/ui/avatar"
import { DashboardNav } from "@/features/dashboard/dashboard-nav"
import { TelegramPrompt } from "@/features/settings/telegram-prompt"
import { Activity, BorrowingLoans, IncomingRequests, LendingLoans, MyItems } from "@/features/dashboard/sections"
import {
  borrowingLoans,
  incomingRequests,
  lendingLoans,
  listingById,
  listings,
  MOCK_NOW,
  notifications,
  users,
} from "@/lib/mock"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("navigation")
  return { title: t("dashboard") }
}

const thing = (id: string) => {
  const l = listingById(id)!
  return { id: l.id, title: l.title, thumb: l.images[0] }
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard")
  const format = await getFormatter()
  const me = users.me
  const first = me.name.split(" ")[0]

  const stats = [
    { key: "active", value: format.number(lendingLoans.length + borrowingLoans.filter((l) => l.status === "active").length) },
    { key: "pending", value: format.number(incomingRequests.length) },
    { key: "completed", value: format.number(me.completedLoans) },
    { key: "rating", value: format.number(me.rating, { minimumFractionDigits: 1 }), star: true },
  ] as const

  return (
    <PageTransition>
      <ClientMessages ns={["dashboard", "borrowing", "notifications", "messages", "telegram"]}>
      <div className="container-qadr grid grid-cols-1 gap-8 py-8 *:min-w-0 lg:grid-cols-[14rem_1fr] lg:gap-12 lg:py-12 xl:grid-cols-[14rem_1fr_20rem]">
        <aside className="lg:sticky lg:top-[calc(var(--header-height)+3rem)] lg:self-start">
          <div className="mb-6 hidden items-center gap-3 lg:flex">
            <Avatar name={me.name} size="lg" />
            <div>
              <p className="font-display text-[1.25rem] leading-tight text-charcoal">{me.name}</p>
              <p className="text-meta text-ink-soft">{me.area}</p>
            </div>
          </div>
          <DashboardNav />
        </aside>

        <div className="min-w-0 space-y-12">
          <TelegramPrompt />
          <header className="relative isolate overflow-hidden rounded-[1.75rem] bg-forest px-6 py-8 text-ivory md:px-10 md:py-10">
            <GirihPattern className="absolute inset-0 -z-10 h-full w-full text-ivory opacity-[0.07]" size={88} />
            <RevealText as="h1" trigger="load" text={t("greeting", { name: first })} className="text-title text-ivory" />
            <p className="mt-3 text-body text-sage">{t("lead")}</p>
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-ivory/15 pt-6 md:grid-cols-4">
              {stats.map((s) => (
                <div key={s.key} className="flex flex-col justify-between">
                  <dt className="text-meta text-sage">{t(`stats.${s.key}`)}</dt>
                  <dd className="mt-1 flex items-center gap-2 font-display text-[2.5rem] leading-none tabular-nums">
                    {s.value}
                    {"star" in s ? <Star className="size-6 fill-ochre text-ochre" aria-hidden="true" /> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </header>

          <IncomingRequests
            requests={incomingRequests.map((r) => ({
              id: r.id,
              item: thing(r.listingId),
              borrower: { name: users[r.borrowerId].name },
              start: r.start,
              end: r.end,
              message: r.message,
            }))}
          />

          <LendingLoans
            now={MOCK_NOW}
            loans={lendingLoans.map((l) => ({
              id: l.id, item: thing(l.listingId), other: { name: users[l.borrowerId].name, phone: users[l.borrowerId].phone },
              start: l.start, end: l.end, status: l.status as "active",
            }))}
          />

          <BorrowingLoans
            now={MOCK_NOW}
            loans={borrowingLoans.map((l) => ({
              id: l.id, item: thing(l.listingId), other: { name: users[l.ownerId].name, phone: users[l.ownerId].phone },
              start: l.start, end: l.end, status: l.status as "approved" | "active",
            }))}
          />

          <MyItems
            items={listings
              .filter((l) => l.ownerId === "me")
              .map((l) => ({ ...thing(l.id), onLoan: lendingLoans.some((x) => x.listingId === l.id) }))}
          />
        </div>

        <aside className="xl:sticky xl:top-[calc(var(--header-height)+3rem)] xl:self-start">
          <Activity
            now={MOCK_NOW}
            items={notifications.map((n) => ({
              id: n.id, type: n.type, name: users[n.actorId].name.split(" ")[0], item: listingById(n.listingId)!.title, at: n.at, read: n.read,
            }))}
          />
        </aside>
      </div>
      </ClientMessages>
    </PageTransition>
  )
}
