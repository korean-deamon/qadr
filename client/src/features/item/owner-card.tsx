import { BadgeCheck, Phone, Star } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { Avatar } from "@/components/ui/avatar"
import { Link } from "@/i18n/navigation"
import type { PublicUser } from "@/lib/api/types"

export function OwnerCard({ owner }: { owner: PublicUser }) {
  const t = useTranslations("listings.item")
  const format = useFormatter()
  return (
    <section aria-labelledby="owner-title" className="rounded-[1.75rem] border border-line bg-white p-6">
      <h2 id="owner-title" className="text-meta font-medium text-ink-soft">{t("owner")}</h2>
      <Link href={`/users/${owner.id}`} className="group mt-4 flex items-center gap-4">
        <Avatar name={owner.name} size="lg" />
        <div>
          <p className="font-display text-[1.5rem] leading-tight text-charcoal transition-colors group-hover:text-forest">{owner.name}</p>
          {owner.area ? <p className="text-caption text-ink-soft">{owner.area}</p> : null}
        </div>
      </Link>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line pt-5 text-caption">
        <div>
          {owner.rating !== null ? (
            <>
              <p className="flex items-center gap-1.5 font-display text-[1.375rem] text-charcoal">
                <Star className="size-4 fill-ochre text-ochre" aria-hidden="true" />
                {format.number(owner.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </p>
              <p className="text-meta text-ink-soft">{t("reviews", { count: owner.rating_count })}</p>
            </>
          ) : (
            <>
              <p className="font-display text-[1.375rem] text-charcoal">{t("noRating")}</p>
              <p className="text-meta text-ink-soft">{t("reviews", { count: 0 })}</p>
            </>
          )}
        </div>
        <div>
          <p className="font-display text-[1.375rem] text-charcoal">{format.number(owner.completed_loans)}</p>
          <p className="text-meta text-ink-soft">{t("completedLabel")}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2.5 text-caption text-charcoal">
        {owner.email_verified ? (
          <li className="flex items-center gap-2.5"><BadgeCheck className="size-[1.125rem] text-forest" aria-hidden="true" />{t("verified")}</li>
        ) : null}
        {owner.phone_verified ? (
          <li className="flex items-center gap-2.5"><Phone className="size-[1.125rem] text-forest" aria-hidden="true" />{t("phoneVerified")}</li>
        ) : null}
        <li className="pl-7 text-meta text-ink-soft">{t("memberSince", { date: format.dateTime(new Date(owner.member_since), { month: "long", year: "numeric" }) })}</li>
      </ul>
    </section>
  )
}
