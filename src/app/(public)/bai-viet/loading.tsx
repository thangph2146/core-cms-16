import { PostListSkeleton } from "@/features/public/post/components/post-list"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Filter } from "lucide-react"

export default function PostLoading() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-7xl">

      {/* Category Navigation Skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Header with Sort Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Post List Skeleton */}
      <PostListSkeleton />
    </div>
  )
}

