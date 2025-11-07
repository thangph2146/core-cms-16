import { AdminHeader } from "@/components/headers"
import { CommentDetail } from "@/features/admin/comments/components/comment-detail"
import { validateRouteId } from "@/lib/validation/route-params"

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
        <CommentDetail commentId={validatedId} backUrl="/admin/comments" />
      </div>
    </>
  )
}

