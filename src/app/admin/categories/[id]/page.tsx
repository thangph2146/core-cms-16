import { AdminHeader } from "@/components/headers"
import { CategoryDetail } from "@/features/admin/categories/components/category-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"

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
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Danh mục")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Danh mục", href: "/admin/categories" },
            { label: "Chi tiết", href: `/admin/categories/${id}` },
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
          { label: "Chi tiết", isActive: true },
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

