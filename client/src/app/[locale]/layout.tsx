import type { Metadata, Viewport } from "next"
import { Brygada_1918, Onest } from "next/font/google"
import { getLocale, getTranslations } from "next-intl/server"
import { ArchClipDefs } from "@/components/branding/motifs"
import { HydrationMarker } from "@/components/hydration-marker"
import { ClientMessages } from "@/components/i18n/client-messages"
import { SessionProvider } from "@/components/session/session-provider"
import { getMe } from "@/lib/api/server"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Header } from "@/components/layout/header"
import { Cursor } from "@/components/motion/cursor"
import { LazyToaster } from "@/components/ui/lazy-toaster"
import { SmoothScroll } from "@/components/motion/smooth-scroll"
import { routing } from "@/i18n/routing"
import { SITE_URL } from "@/lib/i18n/alternates"
import "../globals.css"

// Glyph coverage (Latin, Cyrillic, Uzbek Cyrillic, ʻ U+02BB) verified with fontTools.
// `subsets` = what gets preloaded. Only "latin" (which includes ʻ U+02BB) is
// preloaded; Cyrillic and Latin Extended still load on demand via unicode-range.
const display = Brygada_1918({
  subsets: ["latin"],
  variable: "--font-brygada",
  display: "swap",
})
const sans = Onest({
  subsets: ["latin"],
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
    metadataBase: SITE_URL,
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
  const me = await getMe()

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-forest px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("skipToContent")}
        </a>
        <ArchClipDefs />
        <ClientMessages>
          <SessionProvider initialMe={me}>
          <SmoothScroll />
          <Header />
          {children}
          <BottomNav />
          <LazyToaster />
          <Cursor />
          <HydrationMarker />
          </SessionProvider>
        </ClientMessages>
      </body>
    </html>
  )
}
