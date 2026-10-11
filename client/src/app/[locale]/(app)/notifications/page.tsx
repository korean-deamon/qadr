import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { DashboardShell } from "@/features/dashboard/shell"
import { NotificationsList } from "@/features/notifications/notifications-list"
import { apiServer } from "@/lib/api/server"
import type { NotificationItem } from "@/lib/api/types"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications")
  return { title: t("title") }
}

export default async function NotificationsPage() {
  const t = await getTranslations("notifications")
  const page = await apiServer<{ items: NotificationItem[]; unread: number }>("/notifications?limit=30")
  return (
    <DashboardShell title={t("title")} lead={t("lead")} ns={["notifications"]}>
      <NotificationsList initial={page.items} unread={page.unread} />
    </DashboardShell>
  )
}
