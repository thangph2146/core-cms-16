import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { TagDetail } from "@/features/admin/tags/components/tag-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getTagById } from "@/features/admin/tags/server/queries"
import { truncateBreadcrumbLabel } from "@/features/admin/resources/utils"

/**
 * Tag Detail Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên tag data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "{Tag Name} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const tag = await getTagById(id)

  if (!tag) {
    return {
      title: "Không tìm thấy",
      description: "Thẻ tag không tồn tại",
    }
  }

  return {
    title: tag.name || "Chi tiết thẻ tag",
    description: `Chi tiết thẻ tag: ${tag.name}`,
  }
}

interface TagDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Tag Detail Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, detail content stream khi ready
 */
async function TagDetailContent({ tagId }: { tagId: string }) {
  return <TagDetail tagId={tagId} backUrl="/admin/tags" />
}

export default async function TagDetailPage({ params }: TagDetailPageProps) {
  const { id } = await params
  
  // Fetch tag data (non-cached) để hiển thị tên trong breadcrumb
  // Theo chuẩn Next.js 16: không cache admin data
  const tag = await getTagById(id)
  const tagName = truncateBreadcrumbLabel(tag?.name || "Chi tiết")
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Thẻ tag")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Thẻ tag", href: "/admin/tags" },
            { label: tagName, href: `/admin/tags/${id}` },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">ID không hợp lệ</h2>
              <p className="text-muted-foreground">
                ID thẻ tag không hợp lệ.
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
          { label: "Thẻ tag", href: "/admin/tags" },
          { label: tagName, isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={1}>
          <TagDetailContent tagId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

