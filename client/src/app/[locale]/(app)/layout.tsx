import { getLocale } from "next-intl/server"
import { headers } from "next/headers"
import { redirect } from "@/i18n/navigation"
import { getMe } from "@/lib/api/server"

/**
 * Signed-in app surfaces. Layer 2 of route protection (SPEC §11.1): the proxy
 * already redirected visitors without a session; here the API is the judge.
 */
export default async function AppLayout({ children }: LayoutProps<"/[locale]">) {
  const me = await getMe()
  const locale = await getLocale()
  if (!me) {
    const path = (await headers()).get("x-qadr-path") ?? `/${locale}/dashboard`
    redirect({ href: { pathname: "/login", query: { next: path } }, locale })
  }
  if (!me!.email_verified) redirect({ href: { pathname: "/verify", query: { email: me!.email } }, locale })
  return (
    <main id="main" className="flex min-h-dvh flex-col pt-[var(--header-height)] pb-bottom-nav md:pb-0">
      {children}
    </main>
  )
}
