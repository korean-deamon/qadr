import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export type BadgeStatus =
  | "pending" | "approved" | "rejected" | "cancelled" | "expired"
  | "active" | "returned" | "dueToday" | "dueTomorrow" | "overdue"

const TONE: Record<BadgeStatus, string> = {
  pending: "bg-ochre/25 text-charcoal",
  approved: "bg-forest text-ivory",
  active: "bg-sage text-forest",
  returned: "bg-sage text-ink-soft",
  dueTomorrow: "bg-ochre/25 text-charcoal",
  dueToday: "bg-ochre text-charcoal",
  overdue: "bg-destructive text-white",
  rejected: "bg-white text-ink-soft ring-1 ring-line",
  cancelled: "bg-white text-ink-soft ring-1 ring-line",
  expired: "bg-white text-ink-soft ring-1 ring-line",
}

export function StatusBadge({ status, className }: { status: BadgeStatus; className?: string }) {
  const t = useTranslations("borrowing.status")
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-meta font-semibold whitespace-nowrap", TONE[status], className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full bg-current", status === "pending" && "animate-pulse")} />
      {t(status)}
    </span>
  )
}
