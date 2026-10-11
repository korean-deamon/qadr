import { Skeleton } from "@/components/ui/skeleton"

export function ItemSkeleton() {
  return (
    <div className="container-qadr pt-6 pb-24 md:pt-10" role="status" aria-busy="true">
      <Skeleton className="h-4 w-56" />
      <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <Skeleton className="aspect-[4/3] rounded-[1.75rem] md:aspect-[5/4]" />
          <Skeleton className="mt-10 h-5 w-48 rounded-full" />
          <Skeleton className="mt-5 h-12 w-4/5" />
          <Skeleton className="mt-3 h-4 w-40" />
        </div>
        <div className="lg:col-span-5">
          <Skeleton className="h-[34rem] rounded-[1.75rem]" />
        </div>
      </div>
    </div>
  )
}
