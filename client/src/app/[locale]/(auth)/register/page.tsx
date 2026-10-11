import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageTransition } from "@/components/motion/page-transition"
import { RegisterForm } from "@/features/auth/forms"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register")
  return { title: t("title") }
}

export default function Page() {
  return (
    <PageTransition>
      <div>
        <RegisterForm />
      </div>
    </PageTransition>
  )
}
