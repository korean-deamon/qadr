import Image from "next/image"
import { useTranslations } from "next-intl"
import { Reveal, RevealItem } from "@/components/motion/reveal"
import { Link } from "@/i18n/navigation"
import { categories } from "./data"

/** Categories as a typographic index rather than an icon grid. */
export function CategoryIndex() {
  const t = useTranslations("home.categories")

  return (
    <section id="categories" aria-labelledby="categories-title" className="scroll-mt-24 border-t border-line">
      <div className="container-qadr grid gap-10 py-20 lg:grid-cols-12 lg:gap-10 lg:py-28">
        <Reveal className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          <h2 id="categories-title" className="text-title text-charcoal">{t("title")}</h2>
          <p className="mt-5 max-w-[34ch] text-body text-ink-soft">{t("lead")}</p>
          <Link
            href="/explore"
            className="mt-7 inline-block font-medium text-forest underline decoration-forest/30 underline-offset-[6px] transition-colors hover:decoration-forest"
          >
            {t("viewAll")}
          </Link>
        </Reveal>

        <Reveal as="ol" stagger className="grid sm:grid-cols-2 sm:gap-x-10 lg:col-span-8">
          {categories.map((c) => (
            <RevealItem as="li" key={c.key} className="border-b border-line">
              <Link
                href={`/categories/${c.slug}`}
                className="group flex items-center gap-4 py-4 md:py-5"
              >
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-sage md:size-16">
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover grayscale-[35%] transition-[filter,transform] duration-700 ease-[var(--ease-qadr)] group-hover:scale-110 group-hover:grayscale-0"
                  />
                </span>
                <span className="font-display text-[1.5rem] leading-tight text-charcoal transition-[color,translate] duration-500 ease-[var(--ease-qadr)] group-hover:translate-x-1 group-hover:text-forest md:text-[1.75rem]">
                  {t(`items.${c.key}`)}
                </span>
                <span className="ml-auto text-meta whitespace-nowrap text-ink-soft tabular-nums">
                  {t("count", { count: c.count })}
                </span>
              </Link>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
