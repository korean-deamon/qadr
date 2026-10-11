"use client"

import { Check, LocateFixed, Loader2, Minus, Plus, Trash2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState } from "react"
import { Magnetic } from "@/components/motion/magnetic"
import { Button } from "@/components/ui/button"
import { fieldClass } from "@/components/ui/modal"
import { Field, FieldError, FormAlert } from "@/features/auth/fields"
import { useRouter } from "@/i18n/navigation"
import { api, ApiError } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import type { Category } from "@/lib/api/types"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"
import { Photos, uploadPhoto, type Photo } from "./photos"

export const AREAS = [
  "Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulugʻbek", "Olmazor", "Sergeli",
  "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yangihayot", "Yashnobod", "Yunusobod",
]
const CONDITIONS = ["new", "good", "used"] as const
const MAX_TERMS = 10

export type ListingValues = {
  title: string
  description: string
  category: string
  condition: (typeof CONDITIONS)[number] | ""
  max_days: number
  borrowing_terms: string[]
  location_area: string
  coords: { latitude: number; longitude: number } | null
  hasCoords: boolean
}

type Errors = Partial<Record<"title" | "description" | "category" | "condition" | "location_area" | "photos" | "terms", string>>

export function ListingForm({
  categories,
  initial,
  listingId,
  initialPhotos = [],
}: {
  categories: Category[]
  initial?: Partial<ListingValues>
  listingId?: string
  initialPhotos?: Photo[]
}) {
  const t = useTranslations("listingForm")
  const tc = useTranslations("listings.condition")
  const v = useTranslations("validation")
  const apiError = useApiError()
  const router = useRouter()
  const ids = { desc: useId(), area: useId(), areas: useId(), term: useId() }
  const [values, setValues] = useState<ListingValues>({
    title: "", description: "", category: "", condition: "", max_days: 7, borrowing_terms: [],
    location_area: "", coords: null, hasCoords: false, ...initial,
  })
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [term, setTerm] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string>()
  const [pending, setPending] = useState<"saving" | "uploading" | null>(null)
  const [locating, setLocating] = useState(false)
  const set = <K extends keyof ListingValues>(k: K, val: ListingValues[K]) => {
    setValues((s) => ({ ...s, [k]: val }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const validate = (): Errors => {
    const e: Errors = {}
    if (values.title.trim().length < 3) e.title = t("errors.title")
    if (values.description.trim().length < 10) e.description = t("errors.description")
    if (!values.category) e.category = t("errors.category")
    if (!values.condition) e.condition = t("errors.condition")
    if (values.location_area.trim().length < 2) e.location_area = v("required")
    if (!listingId && photos.length === 0) e.photos = t("errors.photos")
    return e
  }

  const addTerm = () => {
    const x = term.trim()
    if (x.length < 2) return
    if (values.borrowing_terms.length >= MAX_TERMS) return setErrors((e) => ({ ...e, terms: t("errors.terms", { max: MAX_TERMS }) }))
    set("borrowing_terms", [...values.borrowing_terms, x.slice(0, 200)])
    setTerm("")
  }

  const locate = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // ~100 m precision is plenty for "how far"; the exact spot is never shown to anyone
        const r = (n: number) => Math.round(n * 1000) / 1000
        set("coords", { latitude: r(pos.coords.latitude), longitude: r(pos.coords.longitude) })
        setLocating(false)
      },
      () => {
        setLocating(false)
        notify(t("locationDenied"))
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    setFormError(undefined)
    if (Object.keys(found).length) {
      document.querySelector<HTMLElement>("[aria-invalid=true], [data-invalid=true]")?.focus()
      return
    }
    if (photos.some((p) => p.kind === "local" && p.state === "uploading")) return setFormError(t("waitUploads"))
    const body = {
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category,
      condition: values.condition,
      max_days: values.max_days,
      borrowing_terms: values.borrowing_terms,
      location_area: values.location_area.trim(),
      ...(values.coords ?? {}),
    }
    setPending("saving")
    try {
      if (listingId) {
        await api(`/listings/${listingId}`, { method: "PATCH", json: body })
        notify(t("saved"))
        router.push(`/items/${listingId}`)
        router.refresh()
        return
      }
      const { id } = await api<{ id: string }>("/listings", { json: body })
      setPending("uploading")
      let failed = 0
      for (const p of photos) {
        if (p.kind !== "local") continue
        try {
          await uploadPhoto(id, p.file)
        } catch {
          failed++
        }
      }
      if (failed) {
        notify(t("someUploadsFailed", { count: failed }))
        router.push(`/items/${id}/edit`)
      } else {
        notify(t("published"))
        router.push(`/items/${id}`)
      }
      router.refresh()
    } catch (err) {
      setPending(null)
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        const fields = err.body?.fields ?? []
        const next: Errors = {}
        for (const f of fields) {
          const k = f.field.split(".").pop() as keyof Errors
          if (k) next[k] = t("errors.invalid")
        }
        setErrors(next)
      }
      setFormError(apiError(err))
    }
  }

  const chip = (on: boolean) =>
    cn(
      "inline-flex h-10 items-center rounded-full border px-4 text-caption transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest",
      on ? "border-forest bg-forest text-ivory" : "border-line bg-white text-charcoal hover:border-forest/40",
    )

  return (
    <form onSubmit={submit} noValidate className="space-y-10">
      <Section n={1} title={t("sections.photos")} lead={t("sections.photosLead")}>
        <Photos photos={photos} onChange={setPhotos} listingId={listingId} error={errors.photos} />
      </Section>

      <Section n={2} title={t("sections.about")}>
        <div className="space-y-5">
          <Field
            label={t("title")}
            placeholder={t("titlePlaceholder")}
            maxLength={120}
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            error={errors.title}
          />
          <div>
            <label htmlFor={ids.desc} className="text-caption font-medium text-charcoal">{t("description")}</label>
            <textarea
              id={ids.desc}
              rows={5}
              maxLength={4000}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              aria-invalid={!!errors.description}
              className={cn(fieldClass, "mt-2 resize-y", errors.description && "border-destructive/60")}
            />
            <FieldError id={`${ids.desc}-err`} message={errors.description} />
          </div>
          <fieldset data-invalid={!!errors.category || undefined} tabIndex={errors.category ? -1 : undefined}>
            <legend className="text-caption font-medium text-charcoal">{t("category")}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <label key={c.slug} className="cursor-pointer">
                  <input type="radio" name="category" value={c.slug} checked={values.category === c.slug} onChange={() => set("category", c.slug)} className="peer sr-only" />
                  <span className={chip(values.category === c.slug)}>{c.name}</span>
                </label>
              ))}
            </div>
            <FieldError id="category-err" message={errors.category} />
          </fieldset>
          <fieldset data-invalid={!!errors.condition || undefined} tabIndex={errors.condition ? -1 : undefined}>
            <legend className="text-caption font-medium text-charcoal">{t("condition")}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="condition" value={c} checked={values.condition === c} onChange={() => set("condition", c)} className="peer sr-only" />
                  <span className={chip(values.condition === c)}>{tc(c)}</span>
                </label>
              ))}
            </div>
            <FieldError id="condition-err" message={errors.condition} />
          </fieldset>
        </div>
      </Section>

      <Section n={3} title={t("sections.terms")} lead={t("sections.termsLead")}>
        <div className="space-y-6">
          <div>
            <p className="text-caption font-medium text-charcoal" id="max-days-label">{t("maxDays")}</p>
            <div className="mt-3 flex items-center gap-4" role="group" aria-labelledby="max-days-label">
              <Button type="button" variant="outline" size="icon" aria-label={t("fewer")} disabled={values.max_days <= 1} onClick={() => set("max_days", values.max_days - 1)}>
                <Minus aria-hidden="true" />
              </Button>
              <output aria-live="polite" className="min-w-[7ch] text-center font-display text-[1.75rem] text-charcoal tabular-nums">
                {t("days", { days: values.max_days })}
              </output>
              <Button type="button" variant="outline" size="icon" aria-label={t("more")} disabled={values.max_days >= 30} onClick={() => set("max_days", values.max_days + 1)}>
                <Plus aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div>
            <label htmlFor={ids.term} className="text-caption font-medium text-charcoal">{t("rules")}</label>
            {values.borrowing_terms.length ? (
              <ul className="mt-3 space-y-2">
                {values.borrowing_terms.map((x, i) => (
                  <li key={`${x}-${i}`} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 text-caption text-charcoal ring-1 ring-line">
                    <Check className="size-4 shrink-0 text-forest" aria-hidden="true" />
                    <span className="flex-1">{x}</span>
                    <button type="button" onClick={() => set("borrowing_terms", values.borrowing_terms.filter((_, j) => j !== i))} aria-label={t("removeRule")} className="text-ink-soft hover:text-destructive">
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex gap-2">
              <input
                id={ids.term}
                value={term}
                maxLength={200}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTerm()
                  }
                }}
                placeholder={t("rulePlaceholder")}
                className={cn(fieldClass, "h-12 py-0")}
              />
              <Button type="button" variant="outline" className="h-12" onClick={addTerm} disabled={term.trim().length < 2}>
                {t("addRule")}
              </Button>
            </div>
            <FieldError id="terms-err" message={errors.terms} />
          </div>
        </div>
      </Section>

      <Section n={4} title={t("sections.place")} lead={t("sections.placeLead")}>
        <div className="space-y-4">
          <Field
            label={t("area")}
            list={ids.areas}
            placeholder={t("areaPlaceholder")}
            maxLength={80}
            value={values.location_area}
            onChange={(e) => set("location_area", e.target.value)}
            error={errors.location_area}
          />
          <datalist id={ids.areas}>
            {AREAS.map((a) => <option key={a} value={a} />)}
          </datalist>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant={values.coords || values.hasCoords ? "secondary" : "outline"} onClick={locate} disabled={locating}>
              {locating ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LocateFixed aria-hidden="true" />}
              {values.coords ? t("locationSet") : values.hasCoords ? t("locationUpdate") : t("useLocation")}
            </Button>
            <p className="text-meta text-ink-soft">{t("locationNote")}</p>
          </div>
        </div>
      </Section>

      <div className="space-y-4 border-t border-line pt-8">
        <FormAlert message={formError} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {listingId ? <DeleteListing id={listingId} /> : <span />}
          <Magnetic strength={0.12} className="[&>button]:w-full sm:[&>button]:w-auto">
            <Button type="submit" size="lg" disabled={!!pending} className="min-w-56">
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {pending === "uploading" ? t("uploading") : listingId ? t("save") : t("publish")}
            </Button>
          </Magnetic>
        </div>
      </div>
    </form>
  )
}

function Section({ n, title, lead, children }: { n: number; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 md:grid-cols-[3rem_1fr]">
      <span aria-hidden="true" className="hidden size-10 items-center justify-center rounded-full bg-sage font-display text-[1.25rem] text-forest md:flex">{n}</span>
      <div>
        <h2 className="text-[1.625rem] leading-tight text-charcoal">{title}</h2>
        {lead ? <p className="mt-1 max-w-[56ch] text-caption text-ink-soft">{lead}</p> : null}
        <div className="mt-5">{children}</div>
      </div>
    </section>
  )
}

function DeleteListing({ id }: { id: string }) {
  const t = useTranslations("listingForm")
  const apiError = useApiError()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <Button
      type="button"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(t("deleteConfirm"))) return
        setBusy(true)
        try {
          await api(`/listings/${id}`, { method: "DELETE" })
          notify(t("deleted"))
          router.push("/my-items")
          router.refresh()
        } catch (err) {
          notify(apiError(err))
          setBusy(false)
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
      {t("delete")}
    </Button>
  )
}
