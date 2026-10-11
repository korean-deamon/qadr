import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { redirect } from "@/i18n/navigation"
import { PageTransition } from "@/components/motion/page-transition"
import { OtpForm } from "@/features/auth/otp-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verify")
  return { title: t("title") }
}

export default async function VerifyPage({ searchParams }: PageProps<"/[locale]/verify">) {
  const raw = (await searchParams).email
  if (typeof raw !== "string" || !raw.includes("@")) redirect({ href: "/register", locale: await getLocale() })
  const email = (raw as string).slice(0, 120)
  return (
    <PageTransition>
      <div>
        <OtpForm email={email} />
      </div>
    </PageTransition>
  )
}
