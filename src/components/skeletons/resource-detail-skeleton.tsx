/**
 * ResourceDetailSkeleton Component
 * 
 * Skeleton loading state cho ResourceDetailPage
 * Hiển thị cấu trúc detail page với skeleton fields
 */

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export interface ResourceDetailSkeletonProps {
  showHeader?: boolean
  fieldCount?: number
  sectionCount?: number
}

export function ResourceDetailSkeleton({
  showHeader = true,
  sectionCount = 1,
}: ResourceDetailSkeletonProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header Skeleton */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-1.5 flex-1 min-w-0">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      )}

      {/* Content Skeleton */}
      <div className="grid gap-6 grid-cols-1">
        {Array.from({ length: sectionCount }).map((_, sectionIndex) => (
          <Card key={sectionIndex} className={sectionCount === 1 ? "lg:col-span-2" : ""}>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="grid gap-6 grid-cols-1">
                  <div
                    className="py-2.5 border-b border-border/50 last:border-0"
                  >
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-5 w-full" />
                  </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

