import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6" role="status" aria-busy="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="ml-auto h-12 w-2/3 rounded-[1.25rem]" />
      <Skeleton className="h-12 w-1/2 rounded-[1.25rem]" />
      <Skeleton className="ml-auto h-16 w-3/5 rounded-[1.25rem]" />
    </div>
  )
}
