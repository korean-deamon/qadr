import type { Metadata } from "next"
import { alternatesFor } from "@/lib/i18n/alternates"
import { ClientMessages } from "@/components/i18n/client-messages"
import { PageTransition } from "@/components/motion/page-transition"
import { CategoryIndex } from "@/features/home/category-index"
import { Cta } from "@/features/home/cta"
import { Hero } from "@/features/home/hero"
import { Nearby } from "@/features/home/nearby"
import { Steps } from "@/features/home/steps"
import { Trust } from "@/features/home/trust"

export const metadata: Metadata = { alternates: alternatesFor("/") }

export default function HomePage() {
  return (
    <PageTransition>
      <div>
        <Hero />
        <CategoryIndex />
        <Nearby />
        <ClientMessages ns={["home.steps"]}>
          <Steps />
        </ClientMessages>
        <Trust />
        <Cta />
      </div>
    </PageTransition>
  )
}
