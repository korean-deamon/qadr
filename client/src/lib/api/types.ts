/** API response shapes (FastAPI, /api/v1). Dates arrive as ISO strings. */

export type Locale = "uz" | "ru" | "en"

export type Me = {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  area: string | null
  preferred_locale: Locale
  email_verified: boolean
  phone: string | null
  phone_verified: boolean
  telegram_linked: boolean
  telegram_username: string | null
  telegram_notifications: boolean
  show_telegram_prompt: boolean
  is_admin: boolean
  restricted_until: string | null
  created_at: string
}

export type ApiImage = { id: string; url: string; width: number | null; height: number | null }

export type ListingCardData = {
  id: string
  title: string
  area: string
  distance_km: number | null
  max_days: number
  condition: "new" | "good" | "used"
  status: string
  image: ApiImage | null
  owner: { id: string | null; first_name: string; rating: number | null }
  is_saved: boolean
  created_at: string
  on_loan?: boolean
  pending_requests?: number
  moderation_reason?: string | null
}

export type PublicUser = {
  id: string
  name: string
  first_name: string
  avatar_url: string | null
  area: string | null
  email_verified: boolean
  phone_verified: boolean
  member_since: string
  rating: number | null
  rating_count: number
  completed_loans: number
}

export type ListingDetail = {
  id: string
  title: string
  description: string
  condition: "new" | "good" | "used"
  status: string
  max_days: number
  borrowing_terms: string[]
  area: string
  distance_km: number | null
  category: { slug: string | null; name: string | null }
  images: ApiImage[]
  owner: PublicUser
  booked: { start: string; end: string }[]
  on_loan: boolean
  is_owner: boolean
  is_saved: boolean
  my_request: { id: string; status: string; start: string; end: string } | null
  conversation_id: string | null
  moderation_reason: string | null
  has_coordinates?: boolean | null
  created_at: string
}

export type Category = { id: string; slug: string; image: string | null; name: string; count: number }

export type Paged<T> = { items: T[]; total: number; page: number; page_size?: number }

export type ConversationSummary = {
  id: string
  listing: { id: string; title: string; image: string | null }
  with: { id: string; name: string; area: string | null } | null
  role: "owner" | "borrower"
  last_message: ApiMessage | null
  unread: number
  updated_at: string
}

export type ApiMessage = { id: string; kind: "text" | "event"; body: string; sender_id: string | null; created_at: string }

export type ConversationDetail = {
  id: string
  role: "owner" | "borrower"
  listing: { id: string; title: string; image: string | null; status: string }
  with: { id: string; name: string; area: string | null; phone: string | null } | null
  request: { id: string; status: RequestStatus; start: string; end: string } | null
  loan: { id: string; status: LoanStatus } | null
}

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled" | "expired"
export type LoanStatus = "approved" | "active" | "returned" | "cancelled"

export type BorrowRequestView = {
  id: string
  status: RequestStatus
  role: "owner" | "borrower"
  start: string
  end: string
  message: string | null
  created_at: string
  listing: { id: string; title: string; image: string | null }
  with: { id: string; name: string }
}

export type LoanView = {
  id: string
  conversation_id: string | null
  status: LoanStatus
  role: "owner" | "borrower"
  start: string
  end: string
  picked_up_at: string | null
  returned_at: string | null
  borrower_returned_at: string | null
  overdue: boolean
  can_report_not_returned: boolean
  listing: { id: string; title: string; image: string | null; area: string }
  with: { id: string; name: string; phone: string | null }
  my_rating?: number | null
  can_rate?: boolean
}

export type NotificationItem = {
  id: string
  type: string
  payload: Record<string, string | number | null>
  read_at: string | null
  created_at: string
}

export type Counters = { unread_messages: number; unread_notifications: number; pending_requests: number }

export type ApiErrorBody = { error: { code: string; message: string; retry_after?: number; attempts_left?: number; fields?: { field: string; code: string }[]; [k: string]: unknown } }
