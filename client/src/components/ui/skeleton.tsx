import { cn } from "@/lib/utils"

/** Placeholder block with a slow warm shimmer (static under reduced motion). */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("skeleton rounded-xl bg-sage", className)} {...props} />
}
