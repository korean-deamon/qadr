import Image from "next/image"
import { useTranslations } from "next-intl"
import { ArchOutline, GirihPattern } from "@/components/branding/motifs"
import { Link } from "@/i18n/navigation"
import tent from "../../../public/images/tent-view.jpg"

/** Editorial promo woven into the results grid (one per page, never on cards). */
export function Spotlight() {
  const t = useTranslations("explore.spotlight")
  return (
    <Link
      href={{ pathname: "/explore", query: { category: "camping" } }}
      className="group relative isolate flex h-full min-h-[22rem] overflow-hidden rounded-2xl bg-forest p-7 text-ivory"
    >
      <GirihPattern className="absolute inset-0 -z-10 h-full w-full text-ivory opacity-[0.08]" size={80} />
      <div className="relative z-10 flex w-[56%] flex-col">
        <h3 className="text-[1.875rem] leading-tight">{t("title")}</h3>
        <p className="mt-3 text-caption text-sage">{t("body")}</p>
        <span className="mt-auto inline-flex w-fit items-center rounded-full bg-ivory px-5 py-2.5 text-caption font-medium text-forest transition-transform duration-300 group-hover:-translate-y-0.5">
          {t("cta")}
        </span>
      </div>
      <div aria-hidden="true" className="absolute right-5 bottom-0 h-[78%] w-[36%]">
        <div className="relative h-full overflow-hidden [clip-path:url(#qadr-arch)]">
          <Image src={tent} alt="" fill sizes="240px" className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-qadr)] group-hover:scale-105" />
        </div>
        <ArchOutline className="-inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] text-ochre/60" />
      </div>
    </Link>
  )
}
