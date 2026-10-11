import { notFound } from "next/navigation"
import { Thread } from "@/features/messages/thread"
import { conversationById, conversations, listingById, MOCK_NOW, users } from "@/lib/mock"

export function generateStaticParams() {
  return conversations.map((c) => ({ conversationId: c.id }))
}

export default async function ConversationPage({ params }: PageProps<"/[locale]/messages/[conversationId]">) {
  const c = conversationById((await params).conversationId)
  if (!c) notFound()
  const person = users[c.withId]
  const listing = listingById(c.listingId)!
  return (
    <Thread
      now={MOCK_NOW}
      person={{ name: person.name, area: person.area, phone: person.phone }}
      listing={{ id: listing.id, title: listing.title, thumb: listing.images[0] }}
      status={c.requestStatus}
      dates={c.requestDates}
      messages={c.messages}
    />
  )
}
