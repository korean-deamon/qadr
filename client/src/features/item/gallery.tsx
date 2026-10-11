"use client"

import { ImageOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, ViewTransition } from "react"
import { MediaImage } from "@/components/ui/media-image"
import type { ApiImage } from "@/lib/api/types"
import { cn } from "@/lib/utils"

export function Gallery({ id, title, images }: { id: string; title: string; images: ApiImage[] }) {
  const t = useTranslations("listings.item")
  const [index, setIndex] = useState(0)
  // Mount a photo only once it has been shown, so hidden photos never compete with the LCP image
  const [seen, setSeen] = useState<number[]>([0])

  return (
    <section aria-label={t("gallery")}>
      <ViewTransition name={`listing-photo-${id}`} share="morph" default="none">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-sage md:aspect-[5/4]">
          {images.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-forest/40">
              <ImageOff className="size-12" aria-hidden="true" />
            </div>
          ) : null}
          {images.map((img, i) =>
            seen.includes(i) ? (
              <MediaImage
                key={img.id}
                src={img.url}
                alt={images.length > 1 ? `${title}. ${t("photo", { n: i + 1, total: images.length })}` : title}
                fill
                loading={i === 0 ? "eager" : undefined}
                fetchPriority={i === 0 ? "high" : undefined}
                sizes="(min-width: 1024px) 58vw, 100vw"
                aria-hidden={i !== index}
                className={cn(
                  "object-cover transition-[opacity,scale] duration-700 ease-[var(--ease-qadr)]",
                  i === index ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
                )}
              />
            ) : null,
          )}
        </div>
      </ViewTransition>
      {images.length > 1 ? (
        <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIndex(i)
                  setSeen((v) => (v.includes(i) ? v : [...v, i]))
                }}
                aria-label={t("photo", { n: i + 1, total: images.length })}
                aria-pressed={i === index}
                className={cn(
                  "relative block size-20 overflow-hidden rounded-xl ring-offset-2 ring-offset-ivory transition-[box-shadow,opacity,transform] duration-300 active:scale-95 md:size-24",
                  i === index ? "ring-2 ring-forest" : "opacity-70 hover:opacity-100",
                )}
              >
                <MediaImage src={img.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
