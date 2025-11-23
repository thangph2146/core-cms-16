import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { PostEdit } from "@/features/admin/posts/components/post-edit"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getPostById } from "@/features/admin/posts/server/queries"
import { truncateBreadcrumbLabel } from "@/features/admin/resources/utils"
import { applyResourceSegmentToPath, DEFAULT_RESOURCE_SEGMENT } from "@/lib/permissions"

/**
 * Post Edit Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên post data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Chỉnh sửa {Post Title} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ resource?: string; id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getPostById(id)

  if (!post) {
    return {
      title: "Không tìm thấy",
      description: "Bài viết không tồn tại",
    }
  }

  return {
    title: `Chỉnh sửa ${post.title || "bài viết"}`,
    description: `Chỉnh sửa bài viết: ${post.title}`,
  }
}

/**
 * Post Edit Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 */
async function PostEditContent({ postId, resourceSegment }: { postId: string; resourceSegment: string }) {
  const detailHref = applyResourceSegmentToPath(`/admin/posts/${postId}`, resourceSegment)
  return (
    <PostEdit
      postId={postId}
      variant="page"
      backUrl={detailHref}
      backLabel="Quay lại chi tiết"
    />
  )
}

export default async function EditPostPage({
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
  
  // Fetch post data (non-cached) để hiển thị tên trong breadcrumb
  // Theo chuẩn Next.js 16: không cache admin data
  const post = await getPostById(id)
  const postTitle = truncateBreadcrumbLabel(post?.title || "Chi tiết")
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Bài viết")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Bài viết", href: listHref },
            { label: postTitle, href: detailHref },
            { label: "Chỉnh sửa", href: `${detailHref}/edit` },
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
          { label: postTitle, href: detailHref },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={3}>
          <PostEditContent postId={validatedId} resourceSegment={resourceSegment} />
        </FormPageSuspense>
      </div>
    </>
  )
}

