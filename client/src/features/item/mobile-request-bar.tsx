import { useTranslations } from "next-intl"

/** Sticky action above the bottom nav on phones; jumps to the request panel. */
export function MobileRequestBar({ maxDays }: { maxDays: number }) {
  const t = useTranslations()
  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--bottom-nav-height)+1px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-white/95 px-[var(--gutter)] py-3 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="text-caption">
          <p className="font-semibold text-forest">{t("listings.request.free")}</p>
          <p className="text-meta text-ink-soft">{t("listings.upToDays", { days: maxDays })}</p>
        </div>
        <a
          href="#request"
          className="inline-flex h-11 items-center rounded-full bg-forest px-6 text-caption font-medium text-ivory transition-transform active:scale-[0.97]"
        >
          {t("listings.request.jump")}
        </a>
      </div>
    </div>
  )
}
