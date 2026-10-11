import { ClientMessages } from "@/components/i18n/client-messages"
import { getTranslations } from "next-intl/server"
import { ConversationList, type ConversationSummary } from "@/features/messages/conversation-list"
import { tashkentDayDiff, tashkentTime } from "@/lib/i18n/time"
import { conversations, listingById, MOCK_NOW, users } from "@/lib/mock"

export default async function MessagesLayout({ children }: LayoutProps<"/[locale]/messages">) {
  const t = await getTranslations("messages")
  const cal = await getTranslations("common.calendar")

  const items: ConversationSummary[] = conversations.map((c) => {
    const listing = listingById(c.listingId)!
    const last = [...c.messages].reverse().find((m) => m.kind === "text") ?? c.messages.at(-1)!
    const diff = tashkentDayDiff(MOCK_NOW, last.at)
    const when =
      diff === 0
        ? tashkentTime(last.at)
        : diff === 1
          ? t("yesterday")
          : cal("dayMonth", { day: last.at.getDate(), month: cal(`monthShort.${String(last.at.getMonth()) as "0"}`) })
    return {
      id: c.id,
      name: users[c.withId].name,
      listingTitle: listing.title,
      thumb: listing.images[0],
      preview: last.kind === "text" ? last.body : t(`events.${last.event}`),
      fromMe: last.kind === "text" && last.from === "me",
      when,
      unread: c.unread,
    }
  })

  return (
    <ClientMessages ns={["messages", "borrowing"]}>
    <div className="flex h-[calc(100dvh-var(--header-height)-var(--bottom-nav-height)-1px-env(safe-area-inset-bottom))] min-h-0 md:h-[calc(100dvh-var(--header-height))]">
      <div className="mx-auto grid min-h-0 w-full max-w-[88rem] grid-cols-1 *:min-w-0 md:grid-cols-[22rem_1fr] lg:grid-cols-[24rem_1fr]">
        <ConversationList items={items} />
        {children}
      </div>
    </div>
    </ClientMessages>
  )
}
