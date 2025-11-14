import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { PostCreate } from "@/features/admin/posts/components/post-create"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { applyResourceSegmentToPath, DEFAULT_RESOURCE_SEGMENT } from "@/lib/permissions"

/**
 * Post Create Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Tạo bài viết | CMS"
 */
export const metadata: Metadata = {
  title: "Tạo bài viết",
  description: "Tạo bài viết mới",
}

/**
 * Post Create Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 */
async function PostCreateContent({ backUrl }: { backUrl: string }) {
  return <PostCreate backUrl={backUrl} />
}

export default async function CreatePostPage({
  params,
}: {
  params: Promise<{ resource?: string }>
}) {
  const resolvedParams = await params
  const resourceSegment =
    resolvedParams.resource && resolvedParams.resource.length > 0
      ? resolvedParams.resource.toLowerCase()
      : DEFAULT_RESOURCE_SEGMENT
  const listHref = applyResourceSegmentToPath("/admin/posts", resourceSegment)

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Bài viết", href: listHref },
          { label: "Tạo mới", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={3}>
          <PostCreateContent backUrl={listHref} />
        </FormPageSuspense>
      </div>
    </>
  )
}

