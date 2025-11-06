/**
 * Client Component: Contact Request Edit Form
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
import { getBaseContactRequestFields, type ContactRequestFormData } from "../form-fields"
import type { ContactStatus, ContactPriority } from "../types"

interface ContactRequestEditData {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  content: string
  status: ContactStatus
  priority: ContactPriority
  isRead: boolean
  assignedToId: string | null
  updatedAt: string
  [key: string]: unknown
}

export interface ContactRequestEditClientProps {
  contactRequest: ContactRequestEditData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
  contactRequestId?: string
  usersOptions?: Array<{ label: string; value: string }>
}

export function ContactRequestEditClient({
  contactRequest,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  contactRequestId: _contactRequestId,
  usersOptions = [],
}: ContactRequestEditClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (data: Partial<ContactRequestEditData>) => {
    if (!contactRequest?.id) {
      return { success: false, error: "Không tìm thấy yêu cầu liên hệ" }
    }

    try {
      const submitData: Record<string, unknown> = {
        ...data,
      }

      const response = await apiClient.put(apiRoutes.contactRequests.update(contactRequest.id), submitData)

      if (response.status === 200) {
        toast({
          variant: "success",
          title: "Cập nhật yêu cầu liên hệ thành công",
          description: "Yêu cầu liên hệ đã được cập nhật thành công.",
        })

        if (onSuccess) {
          onSuccess()
        } else if (variant === "page" && backUrl) {
          router.push(backUrl)
        } else if (variant === "page") {
          router.push(`/admin/contact-requests/${contactRequest.id}`)
        }

        return { success: true }
      }

      toast({
        variant: "destructive",
        title: "Cập nhật yêu cầu liên hệ thất bại",
        description: "Không thể cập nhật yêu cầu liên hệ. Vui lòng thử lại.",
      })
      return { success: false, error: "Không thể cập nhật yêu cầu liên hệ" }
    } catch (error: unknown) {
      const errorMessage = extractAxiosErrorMessage(error, "Đã xảy ra lỗi khi cập nhật yêu cầu liên hệ")

      toast({
        variant: "destructive",
        title: "Lỗi cập nhật yêu cầu liên hệ",
        description: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

  const editFields = getBaseContactRequestFields(usersOptions)

  if (!contactRequest) {
    return null
  }

  return (
    <ResourceForm<ContactRequestFormData>
      data={contactRequest}
      fields={editFields}
      onSubmit={handleSubmit}
      title="Chỉnh sửa yêu cầu liên hệ"
      description={`Cập nhật thông tin yêu cầu liên hệ: ${contactRequest.subject}`}
      submitLabel="Cập nhật"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel={backLabel}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      showCard={variant === "page" ? false : true}
      className={variant === "page" ? "max-w-[100%]" : "max-w-[800px]"}
    />
  )
}

