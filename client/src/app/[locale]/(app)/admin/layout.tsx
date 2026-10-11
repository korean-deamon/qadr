import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ClientMessages } from "@/components/i18n/client-messages"
import { AdminNav } from "@/features/admin/admin-nav"
import { getMe } from "@/lib/api/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin")
  return { title: { template: `%s · ${t("title")}`, default: t("title") }, robots: { index: false } }
}

/** SPEC §23: non-admins get a plain 404 here; every endpoint also checks on the server. */
export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  const me = await getMe()
  if (!me?.is_admin) notFound()
  return (
    <ClientMessages ns={["admin", "report", "borrowing"]}>
      <div className="container-qadr grid grid-cols-1 gap-8 py-8 *:min-w-0 lg:grid-cols-[13rem_1fr] lg:gap-10 lg:py-10">
        <aside className="lg:sticky lg:top-[calc(var(--header-height)+2.5rem)] lg:self-start">
          <AdminNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </ClientMessages>
  )
}
