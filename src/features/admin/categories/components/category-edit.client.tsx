/**
 * Client Component: Category Edit Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit, useResourceNavigation, useResourceDetailData } from "@/features/admin/resources/hooks"
import { createResourceEditOnSuccess } from "@/features/admin/resources/utils"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { getBaseCategoryFields, type CategoryFormData } from "../form-fields"
import type { CategoryRow } from "../types"

interface CategoryEditData extends CategoryRow {
  slug: string
  description: string | null
  updatedAt: string
  [key: string]: unknown
}

export interface CategoryEditClientProps {
  category: CategoryEditData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
  categoryId?: string
}

export function CategoryEditClient({
  category: initialCategory,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  categoryId,
}: CategoryEditClientProps) {
  const queryClient = useQueryClient()
  const { navigateBack } = useResourceNavigation({
    queryClient,
    invalidateQueryKey: queryKeys.adminCategories.all(),
  })

  // Fetch fresh data từ API để đảm bảo data chính xác (theo chuẩn Next.js 16)
  // Luôn fetch khi có resourceId để đảm bảo data mới nhất, không phụ thuộc vào variant
  const resourceId = categoryId || initialCategory?.id
  const { data: categoryData } = useResourceDetailData({
    initialData: initialCategory || ({} as CategoryEditData),
    resourceId: resourceId || "",
    detailQueryKey: queryKeys.adminCategories.detail,
    resourceName: "categories",
    fetchOnMount: !!resourceId, // Luôn fetch khi có resourceId để đảm bảo data fresh
  })

  // Sử dụng fresh data từ API nếu có, fallback về initial data
  const category = (categoryData as CategoryEditData | null) || initialCategory

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: (id) => apiRoutes.categories.update(id),
    method: "PUT",
    resourceId: category?.id,
    messages: {
      successTitle: "Cập nhật danh mục thành công",
      successDescription: "Danh mục đã được cập nhật thành công.",
      errorTitle: "Lỗi cập nhật danh mục",
    },
    navigation: {
      toDetail: variant === "page" && backUrl
        ? backUrl
        : variant === "page" && category?.id
          ? `/admin/categories/${category.id}`
          : undefined,
      fallback: backUrl,
    },
    onSuccess: createResourceEditOnSuccess({
      queryClient,
      resourceId: category?.id,
      allQueryKey: queryKeys.adminCategories.all(),
      detailQueryKey: queryKeys.adminCategories.detail,
      resourceName: "categories",
      getRecordName: (data) => data.name as string | undefined,
      onSuccess,
    }),
  })

  if (!category?.id) {
    return null
  }

  const editFields = getBaseCategoryFields()

  return (
    <ResourceForm<CategoryFormData>
      data={category}
      fields={editFields}
      onSubmit={handleSubmit}
      title="Chỉnh sửa danh mục"
      description="Cập nhật thông tin danh mục"
      submitLabel="Lưu thay đổi"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel={backLabel}
      onBack={() => navigateBack(backUrl || `/admin/categories/${category?.id || ""}`)}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      showCard={variant === "page" ? false : true}
      className={variant === "page" ? "max-w-[100%]" : undefined}
      resourceName="categories"
      resourceId={category?.id}
      action="update"
    />
  )
}

