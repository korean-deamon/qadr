import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageTransition } from "@/components/motion/page-transition"
import { OtpForm } from "@/features/auth/otp-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verify")
  return { title: t("title") }
}

export const instant = false

export default async function VerifyPage({ searchParams }: PageProps<"/[locale]/verify">) {
  const raw = (await searchParams).email
  const email = typeof raw === "string" && raw.includes("@") ? raw.slice(0, 120) : "dilnoza@mail.uz"
  return (
    <PageTransition>
      <div>
        <OtpForm email={email} />
      </div>
    </PageTransition>
  )
}
