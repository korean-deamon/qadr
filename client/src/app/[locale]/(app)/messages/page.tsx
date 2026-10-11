import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { ArchOutline, GirihPattern } from "@/components/branding/motifs"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messages")
  return { title: t("title") }
}

/** Desktop placeholder beside the list; on phones the list is the whole page. */
export default async function MessagesIndex() {
  const t = await getTranslations("messages")
  return (
    <div className="hidden flex-col items-center justify-center p-10 text-center md:flex">
      <div aria-hidden="true" className="relative h-44 w-36">
        <ArchOutline className="inset-0 h-full w-full text-forest/35" />
        <div className="absolute inset-[10%] overflow-hidden [clip-path:url(#qadr-arch)]">
          <GirihPattern className="h-full w-full text-forest opacity-20" size={40} />
        </div>
      </div>
      <p className="mt-8 font-display text-[1.75rem] text-charcoal">{t("empty")}</p>
      <p className="mt-2 max-w-[32ch] text-caption text-ink-soft">{t("emptyBody")}</p>
    </div>
  )
}
