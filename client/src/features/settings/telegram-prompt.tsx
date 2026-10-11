"use client"

import { Send, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useSession } from "@/components/session/session-provider"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { api } from "@/lib/api/client"

/** Shown after login when no phone is linked (SPEC §11.3); dismiss snoozes it for 7 days. */
export function TelegramPrompt() {
  const t = useTranslations("telegram")
  const { me } = useSession()
  const [hidden, setHidden] = useState(false)
  if (!me?.show_telegram_prompt || hidden) return null
  return (
    <aside className="relative flex flex-col gap-4 rounded-[1.75rem] border border-forest/20 bg-sage px-6 py-5 md:flex-row md:items-center">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-forest text-ivory">
        <Send className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pr-8">
        <p className="font-display text-[1.25rem] leading-tight text-charcoal">{t("promptTitle")}</p>
        <p className="mt-1 text-caption text-ink-soft">{t("promptBody")}</p>
      </div>
      <Button asChild size="sm">
        <Link href="/settings">{t("promptAction")}</Link>
      </Button>
      <button
        type="button"
        aria-label={t("promptLater")}
        onClick={() => {
          setHidden(true)
          void api("/users/me/telegram-prompt/dismiss", { method: "POST" }).catch(() => {})
        }}
        className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-forest"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </aside>
  )
}
