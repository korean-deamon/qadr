/** Admin API shapes (/api/v1/admin/*). */

export type Ref = { id: string; name: string | null }

export type ReportRow = {
  id: string
  reason: string
  status: "open" | "in_review" | "resolved" | "dismissed"
  priority: "high" | "normal"
  target_type: "user" | "listing" | "message"
  target_id: string
  target_user: Ref | null
  reporter: Ref
  listing: { id: string; title: string | null } | null
  assigned_admin: Ref | null
  description: string | null
  resolution: string | null
  resolution_reason: string | null
  created_at: string
  resolved_at: string | null
}

export type UserSummary = {
  id: string
  name: string
  email: string
  phone: string | null
  phone_verified: boolean
  telegram_linked: boolean
  member_since: string
  is_admin: boolean
  restricted_until: string | null
  restriction_reason: string | null
  banned_at: string | null
  ban_reason: string | null
  warnings: number
  reports_as_target: number
  reports_as_reporter: number
  rating: number | null
  rating_count: number
  completed_loans: number
}

export type AuditEntry = {
  id: string
  admin: Ref
  action: string
  target_type: string
  target_id: string | null
  report_id: string | null
  reason: string | null
  meta: Record<string, unknown>
  ip: string | null
  user_agent: string | null
  created_at: string
}

export type ReportDetail = {
  report: ReportRow
  reporter: UserSummary | null
  target: UserSummary | null
  listing: { id: string; title: string; status: string; owner_id: string; image: string | null; moderation_reason: string | null } | null
  history: {
    request_id: string
    request_status: string
    start: string
    end: string
    requested_at: string
    decided_at: string | null
    loan: { id: string; status: string; picked_up_at: string | null; returned_at: string | null; borrower_returned_at: string | null; cancelled_at: string | null } | null
  }[]
  past_reports: Record<"reporter" | "target", { id: string; reason: string; status: string; role: string; created_at: string }[]>
  conversation_id: string | null
  notes: { id: string; body: string; admin: string; created_at: string }[]
  audit: { action: string; admin: string; reason: string | null; meta: Record<string, unknown>; created_at: string }[]
}

export type AdminListing = {
  id: string
  title: string
  status: string
  owner: Ref
  image: string | null
  area: string
  open_reports: number
  moderation_reason: string | null
  created_at: string
}

export type AdminUserDetail = {
  user: UserSummary
  listings: { id: string; title: string; status: string; created_at: string }[]
  warnings: { reason: string; admin: string; created_at: string }[]
  reports: ReportRow[]
  loans: { id: string; status: string; role: string; title: string | null; start: string; end: string }[]
  audit: { action: string; admin: string; reason: string | null; created_at: string }[]
}

export type Stats = Record<"open_reports" | "high_priority" | "users" | "restricted" | "banned" | "listings" | "hidden_listings" | "active_loans", number>
