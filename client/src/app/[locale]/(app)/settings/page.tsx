import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { ClientMessages } from "@/components/i18n/client-messages"
import { PageTransition } from "@/components/motion/page-transition"
import { DeleteAccount, LanguageForm, PasswordForm, ProfileForm } from "@/features/settings/settings-forms"
import { TelegramCard } from "@/features/settings/telegram-card"
import { apiServer } from "@/lib/api/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings")
  return { title: t("title") }
}

export default async function SettingsPage() {
  const t = await getTranslations("settings")
  const telegram = await apiServer<{ enabled: boolean; linked: boolean; username: string | null; phone: string | null; notifications: boolean; blocked: boolean }>("/telegram/status")
  return (
    <PageTransition>
      <ClientMessages ns={["settings", "telegram", "auth", "validation"]}>
        <div className="container-qadr max-w-4xl py-10 md:py-14">
          <h1 className="text-title text-forest">{t("title")}</h1>
          <div className="mt-10 space-y-6">
            <TelegramCard initial={telegram} />
            <ProfileForm />
            <LanguageForm />
            <PasswordForm />
            <DeleteAccount />
          </div>
        </div>
      </ClientMessages>
    </PageTransition>
  )
}
