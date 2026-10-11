import { ImageOff } from "lucide-react"
import { MediaImage } from "@/components/ui/media-image"
import { cn } from "@/lib/utils"

/** Square listing thumbnail with a quiet placeholder when there is no photo. */
export function Thumb({ src, size = "md", className }: { src: string | null | undefined; size?: "sm" | "md" | "lg"; className?: string }) {
  const box = { sm: "size-12", md: "size-16", lg: "size-20" }[size]
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sage", box, className)}>
      {src ? (
        <MediaImage src={src} alt="" fill sizes="80px" className="object-cover" />
      ) : (
        <ImageOff className="size-4 text-forest/50" aria-hidden="true" />
      )}
    </span>
  )
}
