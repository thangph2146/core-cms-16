import { AdminHeader } from "@/components/headers"
import { CategoryCreate } from "@/features/admin/categories/components/category-create"
import { FormPageSuspense } from "@/features/admin/resources/components"

/**
 * Category Create Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 */
async function CategoryCreateContent() {
  return <CategoryCreate />
}

export default async function CategoryCreatePage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Danh mục", href: "/admin/categories" },
          { label: "Tạo mới", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={1}>
          <CategoryCreateContent />
        </FormPageSuspense>
      </div>
    </>
  )
}

