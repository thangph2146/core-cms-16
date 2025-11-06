/**
 * ResourceFormSkeleton Component
 * 
 * Skeleton loading state cho ResourceForm
 * Hiển thị cấu trúc form với skeleton fields
 */

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
} from "@/components/ui/sheet"

export interface ResourceFormSkeletonProps {
  variant?: "page" | "dialog" | "sheet"
  fieldCount?: number
  title?: boolean
  showCard?: boolean
}

export function ResourceFormSkeleton({
  variant = "page",
  fieldCount = 6,
  title = true,
  showCard = true,
}: ResourceFormSkeletonProps) {
  const formFields = (
    <div className="grid gap-6">
      {Array.from({ length: fieldCount }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )

  // Dialog mode
  if (variant === "dialog") {
    return (
      <Dialog open={true}>
        <DialogContent className="max-w-2xl w-full flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            {title && <Skeleton className="h-6 w-48" />}
            <Skeleton className="h-4 w-64 mt-2" />
          </DialogHeader>
          <div className="max-h-[calc(60dvh)] overflow-y-auto">
            <div className="px-6 py-4">
              {formFields}
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 border-t">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Sheet mode
  if (variant === "sheet") {
    return (
      <Sheet open={true}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            {title && <Skeleton className="h-6 w-48" />}
            <Skeleton className="h-4 w-64 mt-2" />
          </SheetHeader>
          <div className="flex-1 -mx-6 px-6 mt-6 overflow-y-auto">
            <div className="pr-4">
              {formFields}
            </div>
          </div>
          <SheetFooter className="mt-6 border-t pt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  // Page mode
  const formContent = showCard ? (
    <Card>
      {title && (
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
      )}
      <CardContent className={title ? undefined : "pt-6"}>
        {formFields}
      </CardContent>
    </Card>
  ) : (
    <div>
      {formFields}
    </div>
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8 mx-auto w-full max-w-[100%]">
      {/* Header */}
      {title && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <div className="space-y-1.5 flex-1 min-w-0">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
      )}

      {/* Form */}
      {formContent}

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  )
}

