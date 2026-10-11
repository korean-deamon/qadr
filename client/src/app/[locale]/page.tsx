import { PageTransition } from "@/components/motion/page-transition"
import { CategoryIndex } from "@/features/home/category-index"
import { Cta } from "@/features/home/cta"
import { Hero } from "@/features/home/hero"
import { Nearby } from "@/features/home/nearby"
import { Steps } from "@/features/home/steps"
import { Trust } from "@/features/home/trust"

export default function HomePage() {
  return (
    <PageTransition>
      <div>
        <Hero />
        <CategoryIndex />
        <Nearby />
        <Steps />
        <Trust />
        <Cta />
      </div>
    </PageTransition>
  )
}
