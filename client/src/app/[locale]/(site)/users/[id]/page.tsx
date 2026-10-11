import { BadgeCheck, MapPin, Phone, Star } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"
import { cache } from "react"
import { GirihPattern } from "@/components/branding/motifs"
import { ClientMessages } from "@/components/i18n/client-messages"
import { ListingCard } from "@/components/listings/listing-card"
import { PageTransition } from "@/components/motion/page-transition"
import { Reveal } from "@/components/motion/reveal"
import { RevealItem } from "@/components/motion/reveal-item"
import { RevealText } from "@/components/motion/reveal-text"
import { Avatar } from "@/components/ui/avatar"
import { ReportDialog } from "@/features/report/report-dialog"
import { apiOrNull, apiServer, getLocation, getMe } from "@/lib/api/server"
import type { ListingCardData, Paged, PublicUser } from "@/lib/api/types"
import { alternatesFor } from "@/lib/i18n/alternates"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const getUser = cache(async (id: string) => (UUID.test(id) ? apiOrNull<PublicUser>(`/users/${id}`) : null))

type Review = { score: number; comment: string | null; from: string; created_at: string }

export async function generateMetadata({ params }: PageProps<"/[locale]/users/[id]">): Promise<Metadata> {
  const { id } = await params
  const user = await getUser(id)
  return user ? { title: user.name, alternates: alternatesFor(`/users/${id}`) } : {}
}

export default async function UserPage({ params }: PageProps<"/[locale]/users/[id]">) {
  const { id } = await params
  const user = await getUser(id)
  if (!user) notFound()
  const t = await getTranslations("profile")
  const format = await getFormatter()
  const loc = await getLocation()
  const me = await getMe()
  const [listings, reviews] = await Promise.all([
    apiServer<Paged<ListingCardData>>(`/listings?owner=${user.id}&page_size=24${loc ? `&lat=${loc.lat}&lng=${loc.lng}` : ""}`),
    apiServer<Review[]>(`/users/${user.id}/ratings`),
  ])

  return (
    <PageTransition>
      <div className="container-qadr pt-8 pb-24 md:pt-12">
        <header className="relative isolate overflow-hidden rounded-[1.75rem] bg-forest px-6 py-8 text-ivory md:px-10 md:py-12">
          <GirihPattern className="absolute inset-0 -z-10 h-full w-full text-ivory opacity-[0.07]" size={88} />
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <Avatar name={user.name} size="xl" className="ring-4 ring-ivory/20" />
            <div className="min-w-0 flex-1">
              <RevealText as="h1" trigger="load" text={user.name} className="text-title text-ivory" />
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-sage">
                {user.area ? (
                  <span className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{user.area}</span>
                ) : null}
                <span>{t("memberSince", { date: format.dateTime(new Date(user.member_since), { month: "long", year: "numeric" }) })}</span>
              </p>
              <ul className="mt-4 flex flex-wrap gap-2 text-meta">
                {user.email_verified ? (
                  <li className="flex items-center gap-1.5 rounded-full bg-ivory/10 px-3 py-1"><BadgeCheck className="size-3.5" aria-hidden="true" />{t("emailVerified")}</li>
                ) : null}
                {user.phone_verified ? (
                  <li className="flex items-center gap-1.5 rounded-full bg-ivory/10 px-3 py-1"><Phone className="size-3.5" aria-hidden="true" />{t("phoneVerified")}</li>
                ) : null}
              </ul>
            </div>
            <dl className="grid grid-cols-2 gap-6 border-t border-ivory/15 pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8">
              <div>
                <dt className="text-meta text-sage">{t("rating")}</dt>
                <dd className="mt-1 flex items-center gap-2 font-display text-[2.5rem] leading-none tabular-nums">
                  {user.rating !== null ? format.number(user.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}
                  {user.rating !== null ? <Star className="size-6 fill-ochre text-ochre" aria-hidden="true" /> : null}
                </dd>
                <dd className="mt-1 text-meta text-sage">{t("reviews", { count: user.rating_count })}</dd>
              </div>
              <div>
                <dt className="text-meta text-sage">{t("completed")}</dt>
                <dd className="mt-1 font-display text-[2.5rem] leading-none tabular-nums">{format.number(user.completed_loans)}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section aria-labelledby="items-title" className="mt-14">
          <RevealText as="h2" id="items-title" text={t("items", { name: user.first_name })} className="text-title text-charcoal" />
          {listings.items.length ? (
            <Reveal as="ul" stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {listings.items.map((l) => (
                <RevealItem as="li" key={l.id}>
                  <ListingCard listing={l} />
                </RevealItem>
              ))}
            </Reveal>
          ) : (
            <p className="mt-4 text-body text-ink-soft">{t("noItems")}</p>
          )}
        </section>

        <section aria-labelledby="reviews-title" className="mt-16 max-w-3xl">
          <RevealText as="h2" id="reviews-title" text={t("reviewsTitle")} className="text-title text-charcoal" />
          {reviews.length ? (
            <ul className="mt-6 divide-y divide-line">
              {reviews.map((r, i) => (
                <li key={i} className="py-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.from} size="sm" />
                    <span className="text-caption font-medium text-charcoal">{r.from}</span>
                    <span className="flex items-center gap-0.5" aria-label={t("stars", { n: r.score })}>
                      {Array.from({ length: 5 }, (_, k) => (
                        <Star key={k} className={k < r.score ? "size-3.5 fill-ochre text-ochre" : "size-3.5 text-line"} aria-hidden="true" />
                      ))}
                    </span>
                    <span className="ml-auto text-meta text-ink-soft">{format.dateTime(new Date(r.created_at), { month: "short", year: "numeric" })}</span>
                  </div>
                  {r.comment ? <p className="mt-2 pl-11 text-body text-charcoal">{r.comment}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-body text-ink-soft">{t("noReviews")}</p>
          )}
        </section>

        {me && me.id !== user.id ? (
          <div className="mt-12">
            <ClientMessages ns={["report"]}>
              <ReportDialog targetType="user" targetId={user.id} reasons={["fraud", "harassment", "spam", "inappropriate", "other"]} />
            </ClientMessages>
          </div>
        ) : null}
      </div>
    </PageTransition>
  )
}
