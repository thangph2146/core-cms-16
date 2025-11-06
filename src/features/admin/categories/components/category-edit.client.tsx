/**
 * Client Component: Category Edit Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { useRouter } from "next/navigation"
import { ResourceForm } from "@/features/admin/resources/components"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { useToast } from "@/hooks/use-toast"
import { extractAxiosErrorMessage } from "@/lib/utils/api-utils"
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
  category,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  categoryId: _categoryId,
}: CategoryEditClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (data: Partial<CategoryEditData>) => {
    if (!category?.id) {
      return { success: false, error: "Không tìm thấy danh mục" }
    }

    try {
      const submitData: Record<string, unknown> = {
        ...data,
      }

      const response = await apiClient.put(apiRoutes.categories.update(category.id), submitData)

      if (response.status === 200) {
        toast({
          variant: "success",
          title: "Cập nhật danh mục thành công",
          description: "Danh mục đã được cập nhật thành công.",
        })

        if (onSuccess) {
          onSuccess()
        } else if (variant === "page" && backUrl) {
          router.push(backUrl)
        } else if (variant === "page") {
          router.push(`/admin/categories/${category.id}`)
        }

        return { success: true }
      }

      toast({
        variant: "destructive",
        title: "Cập nhật danh mục thất bại",
        description: "Không thể cập nhật danh mục. Vui lòng thử lại.",
      })
      return { success: false, error: "Không thể cập nhật danh mục" }
    } catch (error: unknown) {
      const errorMessage = extractAxiosErrorMessage(error, "Đã xảy ra lỗi khi cập nhật danh mục")

      toast({
        variant: "destructive",
        title: "Lỗi cập nhật danh mục",
        description: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
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
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      showCard={variant === "page" ? false : true}
      className={variant === "page" ? "max-w-[100%]" : undefined}
    />
  )
}

