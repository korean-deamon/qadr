import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Thread } from "@/features/messages/thread"
import { apiOrNull } from "@/lib/api/server"
import type { ApiMessage, ConversationDetail } from "@/lib/api/types"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messages")
  return { title: t("title") }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ConversationPage({ params }: PageProps<"/[locale]/messages/[conversationId]">) {
  const { conversationId } = await params
  if (!UUID.test(conversationId)) notFound()
  const [detail, page] = await Promise.all([
    apiOrNull<ConversationDetail>(`/conversations/${conversationId}`),
    apiOrNull<{ items: ApiMessage[]; has_more: boolean }>(`/conversations/${conversationId}/messages`),
  ])
  if (!detail || !page) notFound()
  return <Thread key={detail.id} detail={detail} initial={page.items} hasMore={page.has_more} />
}
