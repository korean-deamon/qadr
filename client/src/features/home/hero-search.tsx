import { MapPin, Search } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

/** Plain GET form: works before hydration and without JavaScript. */
export async function HeroSearch() {
  const t = await getTranslations("home.search")
  const locale = await getLocale()
  const suggestions = ["drill", "tent", "projector", "ladder"] as const

  return (
    <div>
      <form
        role="search"
        action={`/${locale}/explore`}
        method="get"
        className="flex flex-col gap-1 rounded-[1.375rem] border border-line bg-white p-1.5 shadow-soft transition-shadow duration-300 focus-within:border-forest/40 focus-within:shadow-lift sm:flex-row sm:items-center"
      >
        <label className="flex min-w-0 flex-[1.4] items-center gap-3 rounded-2xl px-4 py-3 transition-colors focus-within:bg-ivory">
          <Search className="size-5 shrink-0 text-forest" aria-hidden="true" />
          <span className="sr-only">{t("label")}</span>
          <input
            name="q"
            type="search"
            autoComplete="off"
            placeholder={t("placeholder")}
            className="w-full min-w-0 bg-transparent text-body text-charcoal outline-none placeholder:text-ink-soft"
          />
        </label>
        <span aria-hidden="true" className="mx-4 h-px bg-line sm:mx-0 sm:h-8 sm:w-px" />
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-3 transition-colors focus-within:bg-ivory">
          <MapPin className="size-5 shrink-0 text-forest" aria-hidden="true" />
          <span className="sr-only">{t("areaLabel")}</span>
          <input
            name="area"
            type="text"
            autoComplete="address-level2"
            placeholder={t("areaPlaceholder")}
            className="w-full min-w-0 bg-transparent text-body text-charcoal outline-none placeholder:text-ink-soft"
          />
        </label>
        <button
          type="submit"
          className="h-12 shrink-0 rounded-2xl bg-forest px-7 text-body font-medium text-ivory transition-colors duration-200 hover:bg-forest-deep focus-visible:outline-offset-2"
        >
          {t("submit")}
        </button>
      </form>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2 px-1 text-caption text-ink-soft">
        <span>{t("popular")}:</span>
        {suggestions.map((s) => (
          <Link
            key={s}
            href={{ pathname: "/explore", query: { q: t(`suggestions.${s}`) } }}
            className="font-medium text-charcoal underline decoration-line decoration-1 underline-offset-[5px] transition-colors hover:text-forest hover:decoration-forest"
          >
            {t(`suggestions.${s}`)}
          </Link>
        ))}
      </p>
    </div>
  )
}
