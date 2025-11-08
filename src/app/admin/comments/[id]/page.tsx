import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { CommentDetail } from "@/features/admin/comments/components/comment-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getCommentDetailById } from "@/features/admin/comments/server/cache"

/**
 * Comment Detail Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên comment data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Bình luận {Author} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const comment = await getCommentDetailById(id)

  if (!comment) {
    return {
      title: "Không tìm thấy",
      description: "Bình luận không tồn tại",
    }
  }

  // CommentDetail có authorName và authorEmail từ type
  const authorName = comment.authorName || comment.authorEmail || "Ẩn danh"
  const contentPreview = comment.content ? (comment.content.length > 50 ? comment.content.substring(0, 50) + "..." : comment.content) : ""

  return {
    title: `Bình luận ${authorName}`,
    description: contentPreview || `Bình luận từ ${authorName}`,
  }
}

/**
 * Comment Detail Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, detail content stream khi ready
 */
async function CommentDetailContent({ commentId }: { commentId: string }) {
  return <CommentDetail commentId={commentId} backUrl="/admin/comments" />
}

export default async function CommentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Bình luận")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Bình luận", href: "/admin/comments" },
            { label: "Chi tiết", href: `/admin/comments/${id}` },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">ID không hợp lệ</h2>
              <p className="text-muted-foreground">
                ID bình luận không hợp lệ.
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
          { label: "Bình luận", href: "/admin/comments" },
          { label: "Chi tiết", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={1}>
          <CommentDetailContent commentId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

