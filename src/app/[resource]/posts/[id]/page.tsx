import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { PostDetail } from "@/features/admin/posts/components/post-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getPostDetailById } from "@/features/admin/posts/server/cache"
import { applyResourceSegmentToPath, DEFAULT_RESOURCE_SEGMENT } from "@/lib/permissions"

/**
 * Post Detail Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên post data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "{Post Title} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ resource?: string; id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getPostDetailById(id)

  if (!post) {
    return {
      title: "Không tìm thấy",
      description: "Bài viết không tồn tại",
    }
  }

  return {
    title: post.title || "Chi tiết bài viết",
    description: post.excerpt || `Chi tiết bài viết: ${post.title}`,
  }
}

/**
 * Post Detail Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, detail content stream khi ready
 */
async function PostDetailContent({ postId, resourceSegment }: { postId: string; resourceSegment: string }) {
  const backUrl = applyResourceSegmentToPath("/admin/posts", resourceSegment)
  return <PostDetail postId={postId} backUrl={backUrl} />
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ resource?: string; id: string }>
}) {
  const resolvedParams = await params
  const { id } = resolvedParams
  const resourceSegment =
    resolvedParams.resource && resolvedParams.resource.length > 0
      ? resolvedParams.resource.toLowerCase()
      : DEFAULT_RESOURCE_SEGMENT
  const listHref = applyResourceSegmentToPath("/admin/posts", resourceSegment)
  const detailHref = applyResourceSegmentToPath(`/admin/posts/${id}`, resourceSegment)
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Bài viết")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Bài viết", href: listHref },
            { label: "Chi tiết", href: detailHref },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">ID không hợp lệ</h2>
              <p className="text-muted-foreground">
                ID bài viết không hợp lệ.
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }
  
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Bài viết", href: listHref },
          { label: "Chi tiết", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={8} sectionCount={3}>
          <PostDetailContent postId={validatedId} resourceSegment={resourceSegment} />
        </FormPageSuspense>
      </div>
    </>
  )
}

