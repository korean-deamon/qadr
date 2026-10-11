import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { toQuery, type SearchParams, type SortKey } from "@/lib/search"
import { cn } from "@/lib/utils"

export function SortTabs({ params, located }: { params: SearchParams; located: boolean }) {
  const t = useTranslations("explore.sort")
  const sorts: SortKey[] = located ? ["nearest", "newest", "rating"] : ["newest", "rating"]
  const current = params.sort && sorts.includes(params.sort) ? params.sort : sorts[0]
  return (
    <nav aria-label={t("label")} className="flex items-center gap-1 rounded-full border border-line bg-white p-1">
      {sorts.map((s) => (
        <Link
          key={s}
          href={{ pathname: "/explore", query: toQuery({ ...params, sort: s, page: undefined }) }}
          aria-current={s === current ? "true" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-meta font-medium whitespace-nowrap transition-colors duration-200",
            s === current ? "bg-sage text-forest" : "text-ink-soft hover:text-forest",
          )}
        >
          {t(s)}
        </Link>
      ))}
    </nav>
  )
}
