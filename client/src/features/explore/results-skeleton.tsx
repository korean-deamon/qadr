import { useTranslations } from "next-intl"
import { Skeleton } from "@/components/ui/skeleton"

/** Same grid geometry as the real results, so nothing shifts when they stream in. */
export function ResultsSkeleton({ count = 6 }: { count?: number }) {
  const t = useTranslations("common")
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t("loading")}</span>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-64 rounded-full" />
      </div>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="rounded-2xl border border-line bg-white p-2.5">
            <Skeleton className="aspect-[4/3]" />
            <div className="space-y-3 px-1.5 pt-4 pb-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-5 w-4/5" />
              <div className="flex justify-between pt-1">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
