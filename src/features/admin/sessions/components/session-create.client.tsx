/**
 * Client Component: Session Create Form
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
import { getBaseSessionFields, getSessionFormSections, type SessionFormData } from "../form-fields"

export interface SessionCreateClientProps {
  backUrl?: string
  users?: Array<{ label: string; value: string }>
}

export function SessionCreateClient({ backUrl = "/admin/sessions", users: usersFromServer = [] }: SessionCreateClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (data: Partial<SessionFormData>) => {
    try {
      const submitData: Record<string, unknown> = {
        ...data,
      }

      // Validation được xử lý bởi Zod ở server side
      const response = await apiClient.post(apiRoutes.sessions.create, submitData)

      if (response.status === 201) {
        toast({
          variant: "success",
          title: "Tạo session thành công",
          description: "Session mới đã được tạo thành công.",
        })

        if (response.data?.data?.id) {
          router.push(`/admin/sessions/${response.data.data.id}`)
        } else {
          router.push("/admin/sessions")
        }

        return { success: true }
      }

      toast({
        variant: "destructive",
        title: "Tạo session thất bại",
        description: "Không thể tạo session. Vui lòng thử lại.",
      })
      return { success: false, error: "Không thể tạo session" }
    } catch (error: unknown) {
      const errorMessage = extractAxiosErrorMessage(error, "Đã xảy ra lỗi khi tạo session")

      toast({
        variant: "destructive",
        title: "Lỗi tạo session",
        description: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

  const createFields = getBaseSessionFields(usersFromServer)
  const formSections = getSessionFormSections()

  return (
    <ResourceForm<SessionFormData>
      data={null}
      fields={createFields}
      sections={formSections}
      onSubmit={handleSubmit}
      title="Tạo session mới"
      description="Nhập thông tin để tạo session mới"
      submitLabel="Tạo session"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      variant="page"
      showCard={false}
      className="max-w-[100%]"
    />
  )
}

