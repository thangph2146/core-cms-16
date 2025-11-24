import { PostListSkeleton } from "@/features/public/post/components/post-list"
import { Skeleton } from "@/components/ui/skeleton"
import { Filter, Tags } from "lucide-react"

export default function PostLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 sm:gap-8 lg:gap-12">
        {/* Sidebar - Category Navigation & Tags Skeleton */}
        <aside className="lg:sticky lg:top-20 lg:h-fit lg:max-h-[calc(100vh-5rem)]">
          <div className="space-y-6 mb-6 lg:mb-0">
            {/* Category Navigation Skeleton */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-24 lg:w-full flex-shrink-0 lg:flex-shrink" />
                ))}
              </div>
            </div>

            {/* Tag Navigation Skeleton */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tags className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={`tag-${i}`} className="h-10 w-24 lg:w-full flex-shrink-0 lg:flex-shrink" />
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="min-w-0">
          {/* Header with Sort Skeleton */}
          <div className="sticky top-14 z-50 w-full flex items-center justify-between gap-4 mb-8 border-b bg-background supports-[backdrop-filter]:bg-background/70 border-border backdrop-blur-lg">
            <div className="min-w-0">
              <Skeleton className="h-6 sm:h-8 w-32 sm:w-48 mb-2" />
              <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
            </div>
            <div className="flex-shrink-0">
              <Skeleton className="h-9 sm:h-10 w-28 sm:w-32" />
            </div>
          </div>

          {/* Post List Skeleton */}
          <PostListSkeleton />
        </div>
      </div>
    </div>
  )
}

