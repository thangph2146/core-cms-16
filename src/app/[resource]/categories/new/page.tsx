import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { CategoryCreate } from "@/features/admin/categories/components/category-create"
import { FormPageSuspense } from "@/features/admin/resources/components"

/**
 * Category Create Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Tạo danh mục | CMS"
 */
export const metadata: Metadata = {
  title: "Tạo danh mục",
  description: "Tạo danh mục mới",
}

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

