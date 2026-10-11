import type { Metadata, Viewport } from "next"
import { Brygada_1918, Onest } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"
import { ArchClipDefs } from "@/components/branding/motifs"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { SmoothScroll } from "@/components/motion/smooth-scroll"
import { routing } from "@/i18n/routing"
import "../globals.css"

// Glyph coverage (Latin, Cyrillic, Uzbek Cyrillic, ʻ U+02BB) verified with fontTools.
const display = Brygada_1918({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-brygada",
  display: "swap",
})
const sans = Onest({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-onest",
  display: "swap",
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata")
  const locale = await getLocale()
  return {
    title: { default: t("title"), template: "%s · Qadr" },
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
    openGraph: { siteName: "Qadr", locale, type: "website" },
  }
}

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  viewportFit: "cover",
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale()
  const t = await getTranslations("common")

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col pb-bottom-nav md:pb-0">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-forest px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("skipToContent")}
        </a>
        <ArchClipDefs />
        <NextIntlClientProvider>
          <SmoothScroll />
          <Header />
          <main id="main" className="flex-1 pt-[var(--header-height)]">
            {children}
          </main>
          <Footer />
          <BottomNav />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
