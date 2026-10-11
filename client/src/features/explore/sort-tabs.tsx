import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { SearchParams, SortKey } from "@/lib/mock/search"
import { cn } from "@/lib/utils"

const SORTS: SortKey[] = ["nearest", "newest", "rating"]

export function SortTabs({ params }: { params: SearchParams }) {
  const t = useTranslations("explore.sort")
  const current = params.sort ?? "nearest"
  return (
    <nav aria-label={t("label")} className="flex items-center gap-1 rounded-full border border-line bg-white p-1">
      {SORTS.map((s) => (
        <Link
          key={s}
          href={{
            pathname: "/explore",
            query: Object.fromEntries(
              Object.entries({ ...params, sort: s, condition: params.condition?.join(",") }).filter(([, v]) => v !== undefined && v !== ""),
            ) as Record<string, string>,
          }}
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
