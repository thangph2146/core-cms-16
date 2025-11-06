/**
 * Server Component: Resource Detail
 * 
 * Generic server wrapper cho ResourceDetailPage
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 * 
 * Usage:
 * ```typescript
 * // In your feature (e.g., users)
 * export async function UserDetail({ userId }: UserDetailProps) {
 *   const user = await getUserDetailById(userId)
 *   if (!user) return <NotFound />
 *   return (
 *     <ResourceDetail
 *       data={serializeUserDetail(user)}
 *       fields={userDetailFields}
 *       {...props}
 *     />
 *   )
 * }
 * ```
 * 
 * Hoặc với Suspense:
 * ```typescript
 * <Suspense fallback={<ResourceDetailSkeleton />}>
 *   <ResourceDetail {...props} />
 * </Suspense>
 * ```
 * 
 * Hoặc sử dụng async wrapper:
 * ```typescript
 * <ResourceDetailAsync
 *   dataLoader={async () => {
 *     const user = await getUserDetailById(userId)
 *     return serializeUserDetail(user)
 *   }}
 *   fields={userDetailFields}
 *   {...props}
 * />
 * ```
 */

import { Suspense } from "react"
import { ResourceDetailPage } from "./resource-detail-page"
import type { ResourceDetailPageProps } from "./resource-detail-page"
import { ResourceDetailSkeleton } from "@/components/skeletons"

export type ResourceDetailProps<T extends Record<string, unknown>> = ResourceDetailPageProps<T>

/**
 * ResourceDetail Server Component
 * 
 * Wrapper để pass data từ server xuống client component
 * Mỗi feature nên tạo wrapper riêng để fetch và serialize data cụ thể
 * 
 * Component này được thiết kế để được wrap trong Suspense boundary ở page level
 * để hiển thị skeleton loading state khi data đang được fetch
 */
export function ResourceDetail<T extends Record<string, unknown>>({
  fields,
  sections,
  title,
  ...props
}: ResourceDetailProps<T>) {
  return (
    <ResourceDetailPage
      fields={fields}
      sections={sections}
      title={title}
      {...props}
    />
  )
}

/**
 * ResourceDetailAsync
 * 
 * Async wrapper component với Suspense boundary built-in
 * Sử dụng component này khi bạn muốn fetch data async và hiển thị skeleton tự động
 */
export interface ResourceDetailAsyncProps<T extends Record<string, unknown>> 
  extends Omit<ResourceDetailProps<T>, "data" | "isLoading"> {
  dataLoader: () => Promise<T | null>
  fields: ResourceDetailPageProps<T>["fields"]
  sections?: ResourceDetailPageProps<T>["sections"]
  title?: string
}

export async function ResourceDetailAsync<T extends Record<string, unknown>>({
  dataLoader,
  fields,
  sections,
  title,
  ...props
}: ResourceDetailAsyncProps<T>) {
  // Tính toán số lượng fields và sections để hiển thị skeleton phù hợp
  const defaultFields = Array.isArray(fields) ? fields : fields.fields
  const fieldCount = defaultFields.length
  const sectionCount = sections ? sections.length + 1 : 1 // +1 cho default section

  return (
    <Suspense
      fallback={
        <ResourceDetailSkeleton
          showHeader={!!title}
          fieldCount={fieldCount}
          sectionCount={sectionCount}
        />
      }
    >
      <ResourceDetailAsyncContent
        dataLoader={dataLoader}
        fields={fields}
        sections={sections}
        title={title}
        {...props}
      />
    </Suspense>
  )
}

/**
 * ResourceDetailAsyncContent
 * 
 * Internal component để fetch data và render ResourceDetail
 */
async function ResourceDetailAsyncContent<T extends Record<string, unknown>>({
  dataLoader,
  fields,
  sections,
  title,
  ...props
}: ResourceDetailAsyncProps<T>) {
  const data = await dataLoader()

  return (
    <ResourceDetail
      data={data}
      fields={fields}
      sections={sections}
      title={title}
      {...props}
    />
  )
}

/**
 * ResourceDetailWithSuspense
 * 
 * Wrapper component với Suspense boundary built-in
 * Sử dụng component này nếu bạn muốn Suspense được xử lý tự động
 */
export function ResourceDetailWithSuspense<T extends Record<string, unknown>>({
  fields,
  sections,
  title,
  ...props
}: ResourceDetailProps<T>) {
  // Tính toán số lượng fields và sections để hiển thị skeleton phù hợp
  const defaultFields = Array.isArray(fields) ? fields : fields.fields
  const fieldCount = defaultFields.length
  const sectionCount = sections ? sections.length + 1 : 1 // +1 cho default section

  return (
    <Suspense
      fallback={
        <ResourceDetailSkeleton
          showHeader={!!title}
          fieldCount={fieldCount}
          sectionCount={sectionCount}
        />
      }
    >
      <ResourceDetail
        fields={fields}
        sections={sections}
        title={title}
        {...props}
      />
    </Suspense>
  )
}

