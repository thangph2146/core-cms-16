/**
 * Client Component: Tag Edit Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit, useResourceNavigation } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
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
  const queryClient = useQueryClient()
  const { navigateBack } = useResourceNavigation({
    queryClient,
    invalidateQueryKey: queryKeys.adminTags.all(),
  })
  
  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: (id) => apiRoutes.tags.update(id),
    method: "PUT",
    resourceId: tag?.id,
    messages: {
      successTitle: "Cập nhật thẻ tag thành công",
      successDescription: "Thẻ tag đã được cập nhật thành công.",
      errorTitle: "Lỗi cập nhật thẻ tag",
    },
    navigation: {
      toDetail: variant === "page" && backUrl
        ? backUrl
        : variant === "page" && tag?.id
          ? `/admin/tags/${tag.id}`
          : undefined,
      fallback: backUrl,
    },
    onSuccess: async (_response) => {
      // Invalidate React Query cache để cập nhật danh sách tags
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminTags.all(), refetchType: "all" })
      // Invalidate detail query nếu có tagId
      const targetTagId = tag?.id
      if (targetTagId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminTags.detail(targetTagId) })
      }
      // Refetch để đảm bảo data mới nhất
      await queryClient.refetchQueries({ queryKey: queryKeys.adminTags.all(), type: "all" })
      
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  if (!tag?.id) {
    return null
  }

  const editFields = getBaseTagFields()

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
      onBack={() => navigateBack(backUrl || `/admin/tags/${tag?.id || ""}`)}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      showCard={variant === "page" ? false : true}
      className={variant === "page" ? "max-w-[100%]" : undefined}
    />
  )
}

