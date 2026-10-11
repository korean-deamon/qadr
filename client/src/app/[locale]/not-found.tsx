import { useTranslations } from "next-intl"
import { GirihPattern } from "@/components/branding/motifs"
import { Link } from "@/i18n/navigation"

export default function NotFound() {
  const t = useTranslations("errors")
  return (
    <section className="relative isolate overflow-hidden">
      <GirihPattern className="absolute inset-0 -z-10 h-full w-full text-forest opacity-[0.07]" />
      <div className="container-qadr py-28 lg:py-40">
        <h1 className="max-w-[18ch] text-title text-forest">{t("notFoundTitle")}</h1>
        <p className="mt-5 text-lead text-ink-soft">{t("notFoundBody")}</p>
        <Link href="/" className="mt-9 inline-flex h-12 items-center rounded-full bg-forest px-7 font-medium text-ivory hover:bg-forest-deep">
          {t("backHome")}
        </Link>
      </div>
    </section>
  )
}
