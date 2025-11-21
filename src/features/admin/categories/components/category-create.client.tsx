/**
 * Client Component: Category Create Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { resourceLogger } from "@/lib/config"
import { getBaseCategoryFields, type CategoryFormData } from "../form-fields"
import { useQueryClient } from "@tanstack/react-query"

export interface CategoryCreateClientProps {
  backUrl?: string
}

export function CategoryCreateClient({ backUrl = "/admin/categories" }: CategoryCreateClientProps) {
  const queryClient = useQueryClient()

  const handleBack = async () => {
    // Invalidate React Query cache để đảm bảo list page có data mới nhất
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminCategories.all(), refetchType: "all" })
    // Refetch ngay lập tức để đảm bảo data được cập nhật
    await queryClient.refetchQueries({ queryKey: queryKeys.adminCategories.all(), type: "all" })
  }

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: apiRoutes.categories.create,
    method: "POST",
    messages: {
      successTitle: "Tạo danh mục thành công",
      successDescription: "Danh mục mới đã được tạo thành công.",
      errorTitle: "Lỗi tạo danh mục",
    },
    navigation: {
      toDetail: (response) =>
        response.data?.data?.id ? `/admin/categories/${response.data.data.id}` : backUrl,
      fallback: backUrl,
    },
    onSuccess: async (response) => {
      resourceLogger.actionFlow({
        resource: "categories",
        action: "create",
        step: "success",
        metadata: {
          categoryId: response?.data?.data?.id,
          responseStatus: response?.status,
        },
      })

      // Invalidate React Query cache để cập nhật danh sách categories
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminCategories.all(), refetchType: "all" })
      await queryClient.refetchQueries({ queryKey: queryKeys.adminCategories.all(), type: "all" })
    },
  })

  const createFields = getBaseCategoryFields()

  return (
    <ResourceForm<CategoryFormData>
      data={null}
      fields={createFields}
      onSubmit={handleSubmit}
      title="Tạo danh mục mới"
      description="Nhập thông tin để tạo danh mục mới"
      submitLabel="Tạo danh mục"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      onBack={handleBack}
      variant="page"
      showCard={false}
      className="max-w-[100%]"
    />
  )
}

