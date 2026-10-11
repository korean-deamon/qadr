import { Footer } from "@/components/layout/footer"

/** Public marketing and marketplace pages: content + footer. */
export default function SiteLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="flex min-h-dvh flex-col pb-bottom-nav md:pb-0">
      <main id="main" className="flex-1 pt-[var(--header-height)]">
        {children}
      </main>
      <Footer />
    </div>
  )
}
