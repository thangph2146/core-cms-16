/**
 * Client Component: Session Create Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { getBaseSessionFields, getSessionFormSections, type SessionFormData } from "../form-fields"

export interface SessionCreateClientProps {
  backUrl?: string
  users?: Array<{ label: string; value: string }>
}

export function SessionCreateClient({ backUrl = "/admin/sessions", users: usersFromServer = [] }: SessionCreateClientProps) {
  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: apiRoutes.sessions.create,
    method: "POST",
    messages: {
      successTitle: "Tạo session thành công",
      successDescription: "Session mới đã được tạo thành công.",
      errorTitle: "Lỗi tạo session",
    },
    navigation: {
      toDetail: (response) =>
        response.data?.data?.id ? `/admin/sessions/${response.data.data.id}` : backUrl,
      fallback: backUrl,
    },
  })

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
      resourceName="sessions"
      action="create"
    />
  )
}

