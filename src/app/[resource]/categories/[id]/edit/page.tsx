import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { CategoryEdit } from "@/features/admin/categories/components/category-edit"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getCategoryById } from "@/features/admin/categories/server/queries"
import { createEditBreadcrumbs, truncateBreadcrumbLabel } from "@/features/admin/resources/utils"

/**
 * Category Edit Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên category data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Chỉnh sửa {Category Name} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const category = await getCategoryById(id)

  if (!category) {
    return {
      title: "Không tìm thấy",
      description: "Danh mục không tồn tại",
    }
  }

  return {
    title: `Chỉnh sửa ${category.name || "danh mục"}`,
    description: `Chỉnh sửa thông tin danh mục: ${category.name}`,
  }
}

/**
 * Category Edit Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 */
async function CategoryEditContent({ categoryId }: { categoryId: string }) {
  return <CategoryEdit categoryId={categoryId} variant="page" backUrl={`/admin/categories/${categoryId}`} />
}

export default async function CategoryEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Fetch category data (non-cached) để hiển thị tên trong breadcrumb
  // Theo chuẩn Next.js 16: không cache admin data
  const category = await getCategoryById(id)
  const categoryName = truncateBreadcrumbLabel(category?.name || "Chi tiết")
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Danh mục")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={createEditBreadcrumbs({
            listLabel: "Danh mục",
            listPath: "/admin/categories",
            detailLabel: categoryName,
            detailPath: `/admin/categories/${id}`,
          })}
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
        breadcrumbs={createEditBreadcrumbs({
          listLabel: "Danh mục",
          listPath: "/admin/categories",
          detailLabel: categoryName,
          detailPath: `/admin/categories/${id}`,
        })}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={1}>
          <CategoryEditContent categoryId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

