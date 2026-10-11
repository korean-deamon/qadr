import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { Category } from "@/lib/api/types"
import { toQuery, type SearchParams } from "@/lib/search"
import { cn } from "@/lib/utils"

export function CategoryChips({ params, categories }: { params: SearchParams; categories: Category[] }) {
  const t = useTranslations()
  const href = (category?: string) => ({ pathname: "/explore" as const, query: toQuery({ ...params, category, page: undefined }) })
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
          <li key={c.slug}>
            <Link href={href(c.slug)} aria-current={params.category === c.slug ? "page" : undefined} className={chip(params.category === c.slug)}>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
