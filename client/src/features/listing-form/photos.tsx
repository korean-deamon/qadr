"use client"

import { AlertCircle, ImagePlus, Loader2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { MediaImage } from "@/components/ui/media-image"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import type { ApiImage } from "@/lib/api/types"
import { cn } from "@/lib/utils"

export const MAX_PHOTOS = 8
const MAX_BYTES = 8 * 1024 * 1024
const TYPES = ["image/jpeg", "image/png", "image/webp"]

export type Photo =
  | { kind: "remote"; key: string; image: ApiImage }
  | { kind: "local"; key: string; file: File; preview: string; state: "queued" | "uploading" | "error"; error?: string }

/** Upload one local photo; returns the stored image or throws. */
export async function uploadPhoto(listingId: string, file: File): Promise<ApiImage> {
  const body = new FormData()
  body.append("file", file)
  return api<ApiImage>(`/listings/${listingId}/images`, { method: "POST", body })
}

/**
 * Photo grid. Without `listingId` (new item) files wait locally until the
 * listing exists; with it (edit) they upload and delete immediately.
 */
export function Photos({
  photos,
  onChange,
  listingId,
  error,
}: {
  photos: Photo[]
  onChange: (update: (p: Photo[]) => Photo[]) => void
  listingId?: string
  error?: string
}) {
  const t = useTranslations("listingForm.photos")
  const apiError = useApiError()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // free object URLs on unmount
  const latest = useRef(photos)
  useEffect(() => {
    latest.current = photos
  }, [photos])
  useEffect(() => () => latest.current.forEach((p) => p.kind === "local" && URL.revokeObjectURL(p.preview)), [])

  const add = (files: FileList | File[]) => {
    setNotice(null)
    const room = MAX_PHOTOS - photos.length
    const list = Array.from(files)
    const ok: File[] = []
    for (const f of list) {
      if (!TYPES.includes(f.type)) setNotice(t("type"))
      else if (f.size > MAX_BYTES) setNotice(t("size"))
      else ok.push(f)
    }
    if (ok.length > room) setNotice(t("max", { max: MAX_PHOTOS }))
    const fresh: Photo[] = ok.slice(0, Math.max(0, room)).map((file) => ({
      kind: "local",
      key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      state: listingId ? "uploading" : "queued",
    }))
    onChange((p) => [...p, ...fresh])
    if (listingId) fresh.forEach((p) => void upload(p as Extract<Photo, { kind: "local" }>))
  }

  const upload = async (p: Extract<Photo, { kind: "local" }>) => {
    onChange((list) => list.map((x) => (x.key === p.key ? { ...p, state: "uploading", error: undefined } : x)))
    try {
      const image = await uploadPhoto(listingId!, p.file)
      URL.revokeObjectURL(p.preview)
      onChange((list) => list.map((x) => (x.key === p.key ? { kind: "remote", key: image.id, image } : x)))
    } catch (err) {
      onChange((list) => list.map((x) => (x.key === p.key ? { ...p, state: "error", error: apiError(err) } : x)))
    }
  }

  const remove = async (p: Photo) => {
    if (p.kind === "remote" && listingId) {
      onChange((list) => list.filter((x) => x.key !== p.key))
      try {
        await api(`/listings/${listingId}/images/${p.image.id}`, { method: "DELETE" })
      } catch (err) {
        setNotice(apiError(err))
        onChange((list) => [...list, p])
      }
      return
    }
    if (p.kind === "local") URL.revokeObjectURL(p.preview)
    onChange((list) => list.filter((x) => x.key !== p.key))
  }

  return (
    <div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.key} className="group relative aspect-square overflow-hidden rounded-2xl bg-sage">
            {p.kind === "remote" ? (
              <MediaImage src={p.image.url} alt={t("photo", { n: i + 1 })} fill sizes="160px" className="object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, nothing to optimise
              <img src={p.preview} alt={t("photo", { n: i + 1 })} className="absolute inset-0 size-full object-cover" />
            )}
            {i === 0 ? (
              <span className="absolute bottom-2 left-2 rounded-full bg-charcoal/70 px-2 py-0.5 text-[0.6875rem] font-medium text-ivory">{t("cover")}</span>
            ) : null}
            {p.kind === "local" && p.state === "uploading" ? (
              <span className="absolute inset-0 flex items-center justify-center bg-charcoal/35 text-ivory">
                <Loader2 className="size-6 animate-spin" aria-label={t("uploading")} />
              </span>
            ) : null}
            {p.kind === "local" && p.state === "error" ? (
              <button
                type="button"
                onClick={() => (listingId ? upload(p) : undefined)}
                title={p.error}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/80 p-2 text-center text-[0.6875rem] font-medium text-white"
              >
                <AlertCircle className="size-5" aria-hidden="true" />
                {t("retry")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => remove(p)}
              aria-label={t("remove", { n: i + 1 })}
              className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-soft transition-transform hover:scale-105 active:scale-95"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <li className="aspect-square">
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                add(e.dataTransfer.files)
              }}
              className={cn(
                "flex size-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center text-meta font-medium transition-colors",
                dragging ? "border-forest bg-sage text-forest" : error ? "border-destructive/50 text-destructive" : "border-line text-ink-soft hover:border-forest/40 hover:text-forest",
              )}
            >
              <ImagePlus className="size-6" aria-hidden="true" />
              {photos.length ? t("addMore") : t("add")}
            </button>
          </li>
        ) : null}
      </ul>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files) add(e.target.files)
          e.target.value = ""
        }}
      />
      <p className="mt-2 text-meta text-ink-soft">{t("hint", { max: MAX_PHOTOS })}</p>
      {notice || error ? <p role="alert" className="mt-1.5 text-meta font-medium text-destructive">{notice ?? error}</p> : null}
    </div>
  )
}
