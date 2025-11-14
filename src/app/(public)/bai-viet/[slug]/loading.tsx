import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, User, Clock, Tag } from "lucide-react"

export default function PostDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-5xl">

      <div className="space-y-8">
        {/* Header Skeleton */}
        <header className="space-y-6">

          {/* Title Skeleton */}
          <Skeleton className="h-12 w-full" />

          {/* Excerpt Skeleton */}
          <Skeleton className="h-6 w-3/4" />

          {/* Meta Info Skeleton */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 border-t">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </header>

        {/* Content Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
          <Skeleton className="h-4 w-5/6" />
        </div>

        {/* Tags Skeleton */}
        <div className="flex flex-wrap items-center gap-3 pt-8 border-t">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  )
}

