/**
 * Client Component: Tag Create Form
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
import { generateSlug } from "../utils"

export interface TagCreateClientProps {
  backUrl?: string
}

export function TagCreateClient({ backUrl = "/admin/tags" }: TagCreateClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (data: Partial<TagFormData>) => {
    try {
      const submitData: Record<string, unknown> = {
        ...data,
        // Auto-generate slug if not provided
        slug: data.slug?.trim() || (data.name ? generateSlug(data.name) : ""),
      }

      if (!submitData.name || !submitData.slug) {
        toast({
          variant: "destructive",
          title: "Thiếu thông tin",
          description: "Tên thẻ tag là bắt buộc.",
        })
        return { success: false, error: "Tên thẻ tag là bắt buộc" }
      }

      const response = await apiClient.post(apiRoutes.tags.create, submitData)

      if (response.status === 201) {
        toast({
          variant: "success",
          title: "Tạo thẻ tag thành công",
          description: "Thẻ tag mới đã được tạo thành công.",
        })

        if (response.data?.data?.id) {
          router.push(`/admin/tags/${response.data.data.id}`)
        } else {
          router.push("/admin/tags")
        }

        return { success: true }
      }

      toast({
        variant: "destructive",
        title: "Tạo thẻ tag thất bại",
        description: "Không thể tạo thẻ tag. Vui lòng thử lại.",
      })
      return { success: false, error: "Không thể tạo thẻ tag" }
    } catch (error: unknown) {
      const errorMessage = extractAxiosErrorMessage(error, "Đã xảy ra lỗi khi tạo thẻ tag")

      toast({
        variant: "destructive",
        title: "Lỗi tạo thẻ tag",
        description: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

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
      variant="page"
      showCard={false}
      className="max-w-[100%]"
    />
  )
}

