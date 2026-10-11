import { ClientMessages } from "@/components/i18n/client-messages"
import { ConversationList } from "@/features/messages/conversation-list"
import { apiServer } from "@/lib/api/server"
import type { ConversationSummary } from "@/lib/api/types"

export default async function MessagesLayout({ children }: LayoutProps<"/[locale]/messages">) {
  const items = await apiServer<ConversationSummary[]>("/conversations")
  return (
    <ClientMessages ns={["messages", "borrowing", "report"]}>
      <div className="flex h-[calc(100dvh-var(--header-height)-var(--bottom-nav-height)-1px-env(safe-area-inset-bottom))] min-h-0 md:h-[calc(100dvh-var(--header-height))]">
        <div className="mx-auto grid min-h-0 w-full max-w-[88rem] grid-cols-1 *:min-w-0 md:grid-cols-[22rem_1fr] lg:grid-cols-[24rem_1fr]">
          <ConversationList items={items} />
          {children}
        </div>
      </div>
    </ClientMessages>
  )
}
