import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { redirect } from "@/i18n/navigation"
import { PageTransition } from "@/components/motion/page-transition"
import { ConnectTelegram } from "@/features/auth/connect-telegram"
import type { TelegramStatus } from "@/features/settings/use-telegram-link"
import { apiServer, getMe } from "@/lib/api/server"
import { safeNext } from "@/lib/routes"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.connect")
  return { title: t("title"), robots: { index: false } }
}

/** Mandatory after sign-up (SPEC §11): the only page an unlinked account can open. */
export default async function ConnectTelegramPage({ searchParams }: PageProps<"/[locale]/connect-telegram">) {
  const locale = await getLocale()
  const raw = (await searchParams).next
  const next = typeof raw === "string" ? raw : undefined
  const me = await getMe()
  if (!me) redirect({ href: { pathname: "/login", query: next ? { next } : {} }, locale })
  if (!me!.telegram_required) redirect({ href: safeNext(next, locale).replace(new RegExp(`^/${locale}`), "") || "/", locale })
  const status = await apiServer<TelegramStatus>("/telegram/status")
  return (
    <PageTransition>
      <div>
        <ConnectTelegram initial={status} deleteAt={me!.delete_unverified_at} />
      </div>
    </PageTransition>
  )
}
