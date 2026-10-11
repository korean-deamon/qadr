import Image from "next/image"
import { cn } from "@/lib/utils"
import mark from "../../../public/icons/logo-mark.png"
import full from "../../../public/icons/logo-full.png"

type LogoProps = {
  /** `mark` = symbol + typeset wordmark (header), `full` = complete lockup */
  variant?: "mark" | "full"
  className?: string
  priority?: boolean
}

/** The Qadr logo (client/public/icons). Swap the PNG imports for logo.svg once available. */
export function Logo({ variant = "mark", className, priority }: LogoProps) {
  if (variant === "full") {
    return (
      <Image
        src={full}
        alt="Qadr"
        loading={priority ? "eager" : undefined}
        className={cn("h-auto w-28", className)}
      />
    )
  }
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image src={mark} alt="" loading={priority ? "eager" : undefined} className="size-9 shrink-0" />
      <span className="font-display text-[1.625rem] leading-none font-medium tracking-[-0.01em] text-forest">
        Qadr
      </span>
    </span>
  )
}
