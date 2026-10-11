import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageTransition } from "@/components/motion/page-transition"
import { ResetForm } from "@/features/auth/forms"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset")
  return { title: t("title") }
}

export default function Page() {
  return (
    <PageTransition>
      <div>
        <ResetForm />
      </div>
    </PageTransition>
  )
}
