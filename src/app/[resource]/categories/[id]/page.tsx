import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { CategoryDetail } from "@/features/admin/categories/components/category-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getCategoryDetailById } from "@/features/admin/categories/server/cache"

/**
 * Category Detail Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên category data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "{Category Name} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const category = await getCategoryDetailById(id)

  if (!category) {
    return {
      title: "Không tìm thấy",
      description: "Danh mục không tồn tại",
    }
  }

  return {
    title: category.name || "Chi tiết danh mục",
    description: category.description || `Chi tiết danh mục: ${category.name}`,
  }
}

/**
 * Category Detail Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, detail content stream khi ready
 */
async function CategoryDetailContent({ categoryId }: { categoryId: string }) {
  return <CategoryDetail categoryId={categoryId} backUrl="/admin/categories" />
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Fetch category data từ cache để hiển thị tên trong breadcrumb
  const category = await getCategoryDetailById(id)
  const categoryName = category?.name || "Chi tiết"
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Danh mục")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Danh mục", href: "/admin/categories" },
            { label: categoryName, href: `/admin/categories/${id}` },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">ID không hợp lệ</h2>
              <p className="text-muted-foreground">
                ID danh mục không hợp lệ.
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
          { label: "Danh mục", href: "/admin/categories" },
          { label: categoryName, isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={1}>
          <CategoryDetailContent categoryId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

