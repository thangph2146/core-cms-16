"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { resourceLogger } from "@/lib/config"
import { getBaseTagFields, type TagFormData } from "../form-fields"

export interface TagCreateClientProps {
  backUrl?: string
}

export function TagCreateClient({ backUrl = "/admin/tags" }: TagCreateClientProps) {
  const queryClient = useQueryClient()
  
  const handleBack = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminTags.all(), refetchType: "all" })
    await queryClient.refetchQueries({ queryKey: queryKeys.adminTags.all(), type: "all" })
  }
  
  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: apiRoutes.tags.create,
    method: "POST",
    messages: {
      successTitle: "Tạo thẻ tag thành công",
      successDescription: "Thẻ tag mới đã được tạo thành công.",
      errorTitle: "Lỗi tạo thẻ tag",
    },
    navigation: {
      toDetail: (response) =>
        response.data?.data?.id ? `/admin/tags/${response.data.data.id}` : backUrl,
      fallback: backUrl,
    },
    onSuccess: async (response) => {
      resourceLogger.actionFlow({
        resource: "tags",
        action: "create",
        step: "success",
        metadata: {
          tagId: response?.data?.data?.id,
          responseStatus: response?.status,
        },
      })

      await queryClient.invalidateQueries({ queryKey: queryKeys.adminTags.all(), refetchType: "all" })
      await queryClient.refetchQueries({ queryKey: queryKeys.adminTags.all(), type: "all" })
    },
  })

  const createFields = getBaseTagFields()

  return (
    <ResourceForm<TagFormData>
      data={null}
      fields={createFields}
      onSubmit={handleSubmit}
      title="Tạo thẻ tag mới"
      description="Nhập thông tin để tạo thẻ tag mới"
      submitLabel="Tạo thẻ tag"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      onBack={handleBack}
      variant="page"
      showCard={false}
      className="max-w-[100%]"
      resourceName="tags"
      action="create"
    />
  )
}

