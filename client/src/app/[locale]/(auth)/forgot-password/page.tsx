import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageTransition } from "@/components/motion/page-transition"
import { ForgotForm } from "@/features/auth/forms"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot")
  return { title: t("title") }
}

export default function Page() {
  return (
    <PageTransition>
      <div>
        <ForgotForm />
      </div>
    </PageTransition>
  )
}
