import { useTranslations } from "next-intl"
import { ArchOutline, GirihPattern } from "@/components/branding/motifs"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

export function EmptyState({ query }: { query: string }) {
  const t = useTranslations("explore.empty")
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div aria-hidden="true" className="relative h-40 w-32">
        <ArchOutline className="inset-0 h-full w-full text-forest/40" />
        <div className="absolute inset-[10%] overflow-hidden [clip-path:url(#qadr-arch)]">
          <GirihPattern className="h-full w-full text-forest opacity-25" size={40} />
        </div>
      </div>
      <h2 className="mt-8 max-w-[24ch] text-section text-charcoal">{t("title", { q: query })}</h2>
      <p className="mt-3 max-w-[40ch] text-body text-ink-soft">{t("body")}</p>
      <Button asChild variant="secondary" className="mt-7">
        <Link href="/explore">{t("action")}</Link>
      </Button>
    </div>
  )
}
