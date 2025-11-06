/**
 * ResourceTableSkeleton Component
 * 
 * Skeleton loading state cho ResourceTable
 * Hiển thị cấu trúc table với skeleton rows
 */

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface ResourceTableSkeletonProps {
  title?: boolean
  viewModes?: number
  rowCount?: number
  columnCount?: number
}

export function ResourceTableSkeleton({
  title = true,
  viewModes = 1,
  rowCount = 5,
  columnCount = 4,
}: ResourceTableSkeletonProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Header Skeleton */}
      {(title || viewModes > 1) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          {title ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {viewModes > 1 && (
              <>
                {Array.from({ length: viewModes }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-20" />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Table Skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {Array.from({ length: columnCount }).map((_, index) => (
                    <TableHead key={index}>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                  <TableRow key={`skeleton-row-${rowIndex}`}>
                    {Array.from({ length: columnCount }).map((__, cellIndex) => (
                      <TableCell key={`skeleton-cell-${rowIndex}-${cellIndex}`}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Pagination Skeleton */}
          <div className="flex items-center justify-between gap-3 border-t border-border px-2 py-4 mt-4">
            <Skeleton className="h-5 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

