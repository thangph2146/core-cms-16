/**
 * Client Component: Category Edit Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit, useResourceNavigation } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { getBaseCategoryFields, type CategoryFormData } from "../form-fields"
import type { CategoryRow } from "../types"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

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
  category,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  categoryId: _categoryId,
}: CategoryEditClientProps) {
  const queryClient = useQueryClient()
  const { navigateBack } = useResourceNavigation({
    queryClient,
    invalidateQueryKey: queryKeys.adminCategories.all(),
  })

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
    onSuccess: async (_response) => {
      // Invalidate React Query cache để cập nhật danh sách categories
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminCategories.all(), refetchType: "all" })
      // Invalidate detail query nếu có categoryId
      const targetCategoryId = category?.id
      if (targetCategoryId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminCategories.detail(targetCategoryId) })
      }
      // Refetch để đảm bảo data mới nhất
      await queryClient.refetchQueries({ queryKey: queryKeys.adminCategories.all(), type: "all" })
      
      if (onSuccess) {
        onSuccess()
      }
    },
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
    />
  )
}

