"use client"

import { Search } from "lucide-react"
import Image, { type StaticImageData } from "next/image"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { Avatar } from "@/components/ui/avatar"
import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export type ConversationSummary = {
  id: string
  name: string
  listingTitle: string
  thumb: StaticImageData
  preview: string
  fromMe: boolean
  when: string
  unread: number
}

export function ConversationList({ items }: { items: ConversationSummary[] }) {
  const t = useTranslations("messages")
  const pathname = usePathname()
  const [q, setQ] = useState("")
  const threadOpen = pathname.startsWith("/messages/")
  const shown = items.filter((c) => `${c.name} ${c.listingTitle}`.toLocaleLowerCase().includes(q.toLocaleLowerCase()))

  return (
    <aside className={cn("flex min-h-0 flex-col border-line md:border-r", threadOpen && "hidden md:flex")}>
      <div className="px-[var(--gutter)] pt-6 pb-4 md:px-5">
        <h1 className="text-title text-charcoal md:text-section">{t("title")}</h1>
        <label className="mt-4 flex items-center gap-2.5 rounded-full border border-line bg-white px-4 py-2.5 focus-within:border-forest/40">
          <Search className="size-4 text-ink-soft" aria-hidden="true" />
          <span className="sr-only">{t("search")}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="w-full bg-transparent text-caption text-charcoal outline-none placeholder:text-ink-soft"
          />
        </label>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 md:px-3" data-lenis-prevent>
        {shown.map((c) => {
          const active = pathname === `/messages/${c.id}`
          return (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex gap-3 rounded-2xl px-3 py-3.5 transition-colors duration-200",
                  active ? "bg-white shadow-soft" : "hover:bg-white/70",
                )}
              >
                <span className="relative">
                  <Avatar name={c.name} />
                  <span className="absolute -right-1 -bottom-1 size-6 overflow-hidden rounded-md ring-2 ring-ivory">
                    <Image src={c.thumb} alt="" fill sizes="24px" className="object-cover" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-caption text-charcoal", c.unread ? "font-semibold" : "font-medium")}>{c.name}</span>
                    <span className={cn("shrink-0 text-meta", c.unread ? "font-semibold text-forest" : "text-ink-soft")}>{c.when}</span>
                  </span>
                  <span className="block truncate text-meta text-ink-soft">{c.listingTitle}</span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className={cn("truncate text-caption", c.unread ? "text-charcoal" : "text-ink-soft")}>
                      {c.fromMe ? <span className="text-ink-soft">{t("you")} </span> : null}
                      {c.preview}
                    </span>
                    {c.unread ? (
                      <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-forest text-[0.6875rem] font-semibold text-ivory">
                        {c.unread}
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
