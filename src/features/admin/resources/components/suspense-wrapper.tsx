/**
 * Suspense Wrapper Components
 * 
 * Shared components để wrap async components với Suspense boundaries
 * Giúp clean code và dễ scale cho tất cả admin pages
 * 
 * Theo Next.js 16 best practices:
 * - Multiple Suspense boundaries để stream các phần độc lập
 * - Progressive rendering với meaningful fallback UI
 * - Selective hydration
 */

import { Suspense, type ReactNode } from "react"
import { ResourceDetailSkeleton, ResourceTableSkeleton } from "@/components/skeletons"

/**
 * SuspenseWrapper - Generic wrapper cho async components
 * 
 * Usage:
 * ```tsx
 * <SuspenseWrapper fallback={<Skeleton />}>
 *   <AsyncComponent />
 * </SuspenseWrapper>
 * ```
 */
export interface SuspenseWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  skeletonConfig?: {
    showHeader?: boolean
    fieldCount?: number
    sectionCount?: number
  }
}

export function SuspenseWrapper({
  children,
  fallback,
  skeletonConfig,
}: SuspenseWrapperProps) {
  const defaultFallback = skeletonConfig ? (
    <ResourceDetailSkeleton
      showHeader={skeletonConfig.showHeader ?? true}
      fieldCount={skeletonConfig.fieldCount ?? 6}
      sectionCount={skeletonConfig.sectionCount ?? 1}
    />
  ) : (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-muted-foreground">Đang tải...</div>
    </div>
  )

  return <Suspense fallback={fallback ?? defaultFallback}>{children}</Suspense>
}

/**
 * FormPageSuspense - Wrapper cho form pages (create/edit)
 * 
 * Usage:
 * ```tsx
 * <FormPageSuspense fieldCount={8} sectionCount={2}>
 *   <FormComponent />
 * </FormPageSuspense>
 * ```
 */
export interface FormPageSuspenseProps {
  children: ReactNode
  fieldCount?: number
  sectionCount?: number
}

export function FormPageSuspense({
  children,
  fieldCount = 6,
  sectionCount = 1,
}: FormPageSuspenseProps) {
  return (
    <SuspenseWrapper
      skeletonConfig={{
        showHeader: true,
        fieldCount,
        sectionCount,
      }}
    >
      {children}
    </SuspenseWrapper>
  )
}

/**
 * TablePageSuspense - Wrapper cho table pages (list)
 * 
 * Usage:
 * ```tsx
 * <TablePageSuspense columnCount={6} rowCount={10}>
 *   <TableComponent />
 * </TablePageSuspense>
 * ```
 */
export interface TablePageSuspenseProps {
  children: ReactNode
  columnCount?: number
  rowCount?: number
}

export function TablePageSuspense({
  children,
  columnCount = 4,
  rowCount = 10,
}: TablePageSuspenseProps) {
  return (
    <SuspenseWrapper
      fallback={<ResourceTableSkeleton title={false} rowCount={rowCount} columnCount={columnCount} />}
    >
      {children}
    </SuspenseWrapper>
  )
}

