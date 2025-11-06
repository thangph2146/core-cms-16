/**
 * Client Component: Tag Edit Form
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
import { getBaseTagFields, type TagFormData } from "../form-fields"
import type { TagRow } from "../types"

interface TagEditData extends TagRow {
  slug: string
  updatedAt: string
  [key: string]: unknown
}

export interface TagEditClientProps {
  tag: TagEditData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
  tagId?: string
}

export function TagEditClient({
  tag,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  tagId: _tagId,
}: TagEditClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (data: Partial<TagEditData>) => {
    if (!tag?.id) {
      return { success: false, error: "Không tìm thấy thẻ tag" }
    }

    try {
      const submitData: Record<string, unknown> = {
        ...data,
      }

      const response = await apiClient.put(apiRoutes.tags.update(tag.id), submitData)

      if (response.status === 200) {
        toast({
          variant: "success",
          title: "Cập nhật thẻ tag thành công",
          description: "Thẻ tag đã được cập nhật thành công.",
        })

        if (onSuccess) {
          onSuccess()
        } else if (variant === "page" && backUrl) {
          router.push(backUrl)
        } else if (variant === "page") {
          router.push(`/admin/tags/${tag.id}`)
        }

        return { success: true }
      }

      toast({
        variant: "destructive",
        title: "Cập nhật thẻ tag thất bại",
        description: "Không thể cập nhật thẻ tag. Vui lòng thử lại.",
      })
      return { success: false, error: "Không thể cập nhật thẻ tag" }
    } catch (error: unknown) {
      const errorMessage = extractAxiosErrorMessage(error, "Đã xảy ra lỗi khi cập nhật thẻ tag")

      toast({
        variant: "destructive",
        title: "Lỗi cập nhật thẻ tag",
        description: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

  const editFields = getBaseTagFields()

  if (!tag) {
    return null
  }

  return (
    <ResourceForm<TagFormData>
      data={tag}
      fields={editFields}
      onSubmit={handleSubmit}
      title="Chỉnh sửa thẻ tag"
      description="Cập nhật thông tin thẻ tag"
      submitLabel="Cập nhật"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel={backLabel}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}

