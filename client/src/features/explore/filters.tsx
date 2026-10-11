"use client"

import { SlidersHorizontal, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Dialog } from "radix-ui"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LocationButton } from "@/components/location/location-button"
import type { Condition, SearchParams } from "@/lib/search"

const DISTANCES = [1, 3, 5, 10]
const CONDITIONS: Condition[] = ["new", "good", "used"]

/** GET form: filters work without JavaScript; on mobile it lives in a bottom sheet. */
function FilterForm({ params, id, located }: { params: SearchParams; id: string; located: boolean }) {
  const t = useTranslations()
  const locale = useLocale()
  return (
    <form id={id} action={`/${locale}/explore`} method="get" className="space-y-8">
      {params.q ? <input type="hidden" name="q" value={params.q} /> : null}
      {params.category ? <input type="hidden" name="category" value={params.category} /> : null}
      {params.sort ? <input type="hidden" name="sort" value={params.sort} /> : null}
      {params.area ? <input type="hidden" name="area" value={params.area} /> : null}

      <fieldset>
        <legend className="font-display text-[1.25rem] text-charcoal">{t("explore.distance")}</legend>
        {located ? null : <p className="mt-2 text-meta text-ink-soft">{t("location.hint")}</p>}
        <LocationButton active={located} className="mt-3" />
        <div className={located ? "mt-3 grid grid-cols-2 gap-2" : "hidden"}>
          {DISTANCES.map((km) => (
            <label key={km} className="relative">
              <input type="radio" name="km" value={km} defaultChecked={params.km === km} className="peer sr-only" />
              <span className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-white text-caption text-charcoal transition-colors peer-checked:border-forest peer-checked:bg-forest peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest hover:border-forest/40">
                {t("explore.within", { km })}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-display text-[1.25rem] text-charcoal">{t("explore.condition")}</legend>
        <div className="mt-3 space-y-2.5">
          {CONDITIONS.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-3 text-caption text-charcoal">
              <input type="checkbox" name="condition" value={c} defaultChecked={params.condition?.includes(c)} className="peer sr-only" />
              <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-md border border-line bg-white transition-colors peer-checked:border-forest peer-checked:bg-forest peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest after:size-2 after:rounded-[2px] after:bg-ivory after:opacity-0 peer-checked:after:opacity-100" />
              {t(`listings.condition.${c}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center justify-between gap-4 text-caption text-charcoal">
        {t("explore.availableNow")}
        <input type="checkbox" name="available" value="1" defaultChecked={params.available} className="peer sr-only" />
        <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-forest peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-soft after:transition-transform after:duration-300 after:ease-[var(--ease-qadr)] peer-checked:after:translate-x-5" />
      </label>
    </form>
  )
}

export function FiltersSidebar({ params, located }: { params: SearchParams; located: boolean }) {
  const t = useTranslations("explore")
  return (
    <div className="rounded-3xl border border-line bg-white p-6">
      <h2 className="sr-only">{t("filters")}</h2>
      <FilterForm params={params} id="filters-desktop" located={located} />
      <div className="mt-8 flex items-center justify-between gap-3">
        <a href="?" className="text-caption font-medium text-ink-soft underline-offset-4 hover:text-forest hover:underline">{t("reset")}</a>
        <Button type="submit" form="filters-desktop" size="sm">{t("apply")}</Button>
      </div>
    </div>
  )
}

export function FiltersSheet({ params, active, located }: { params: SearchParams; active: number; located: boolean }) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" className="h-10">
          <SlidersHorizontal aria-hidden="true" />
          {t("explore.filters")}
          {active ? <span className="flex size-5 items-center justify-center rounded-full bg-forest text-[0.6875rem] text-ivory">{active}</span> : null}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-[1.75rem] bg-ivory px-[var(--gutter)] pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] duration-500 ease-[var(--ease-qadr)] data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom"
          data-lenis-prevent
        >
          <span aria-hidden="true" className="mx-auto mb-4 block h-1 w-10 rounded-full bg-line" />
          <div className="mb-6 flex items-center justify-between">
            <Dialog.Title className="font-display text-[1.75rem] text-charcoal">{t("explore.filters")}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t("common.close")}>
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{t("explore.filters")}</Dialog.Description>
          <FilterForm params={params} id="filters-mobile" located={located} />
          <div className="sticky bottom-0 mt-8 flex items-center gap-3 bg-ivory pt-3">
            <a href="?" className="px-2 text-caption font-medium text-ink-soft">{t("explore.reset")}</a>
            <Button type="submit" form="filters-mobile" className="flex-1">{t("explore.apply")}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
