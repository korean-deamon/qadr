import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { categories, type CategoryKey } from "@/lib/mock"
import type { SearchParams } from "@/lib/mock/search"
import { cn } from "@/lib/utils"

export function CategoryChips({ params }: { params: SearchParams }) {
  const t = useTranslations()
  const href = (category?: CategoryKey) => ({
    pathname: "/explore" as const,
    query: Object.fromEntries(
      Object.entries({ ...params, category, condition: params.condition?.join(",") }).filter(([, v]) => v !== undefined && v !== ""),
    ) as Record<string, string>,
  })
  const chip = (active: boolean) =>
    cn(
      "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-caption font-medium transition-[background-color,color,border-color,transform] duration-200 active:scale-[0.97]",
      active ? "border-forest bg-forest text-ivory" : "border-line bg-white text-charcoal hover:border-forest/40 hover:text-forest",
    )

  return (
    <nav aria-label={t("navigation.categories")} className="-mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)] [scrollbar-width:none]" data-lenis-prevent-horizontal>
      <ul className="flex gap-2 pb-1">
        <li>
          <Link href={href(undefined)} aria-current={!params.category ? "page" : undefined} className={chip(!params.category)}>
            {t("explore.all")}
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.key}>
            <Link href={href(c.key)} aria-current={params.category === c.key ? "page" : undefined} className={chip(params.category === c.key)}>
              {t(`home.categories.items.${c.key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
