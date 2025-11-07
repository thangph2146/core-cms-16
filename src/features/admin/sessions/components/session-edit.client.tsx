/**
 * Client Component: Session Edit Form
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
import type { SessionRow } from "../types"

interface SessionEditData extends SessionRow {
  userId: string
  [key: string]: unknown
}

export interface SessionEditClientProps {
  session: SessionEditData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
  sessionId?: string
  users?: Array<{ label: string; value: string }>
}

export function SessionEditClient({
  session,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  sessionId: _sessionId,
  users: usersFromServer = [],
}: SessionEditClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (data: Partial<SessionEditData>) => {
    if (!session?.id) {
      return { success: false, error: "Không tìm thấy session" }
    }

    try {
      const submitData: Record<string, unknown> = {
        ...data,
      }

      // Validation được xử lý bởi Zod ở server side
      const response = await apiClient.put(apiRoutes.sessions.update(session.id), submitData)

      if (response.status === 200) {
        toast({
          variant: "success",
          title: "Cập nhật session thành công",
          description: "Session đã được cập nhật thành công.",
        })

        if (onSuccess) {
          onSuccess()
        } else if (variant === "page" && backUrl) {
          router.push(backUrl)
        } else if (variant === "page") {
          router.push(`/admin/sessions/${session.id}`)
        }

        return { success: true }
      }

      toast({
        variant: "destructive",
        title: "Cập nhật session thất bại",
        description: "Không thể cập nhật session. Vui lòng thử lại.",
      })
      return { success: false, error: "Không thể cập nhật session" }
    } catch (error: unknown) {
      const errorMessage = extractAxiosErrorMessage(error, "Đã xảy ra lỗi khi cập nhật session")

      toast({
        variant: "destructive",
        title: "Lỗi cập nhật session",
        description: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

  const editFields = getBaseSessionFields(usersFromServer)
  const formSections = getSessionFormSections()

  if (!session) {
    return null
  }

  return (
    <ResourceForm<SessionFormData>
      data={session}
      fields={editFields}
      sections={formSections}
      onSubmit={handleSubmit}
      title="Chỉnh sửa session"
      description="Cập nhật thông tin session"
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

