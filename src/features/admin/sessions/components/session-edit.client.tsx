/**
 * Client Component: Session Edit Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit, useResourceDetailData } from "@/features/admin/resources/hooks"
import { createResourceEditOnSuccess } from "@/features/admin/resources/utils"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
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
  session: initialSession,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  sessionId,
  users: usersFromServer = [],
}: SessionEditClientProps) {
  const queryClient = useQueryClient()

  // Fetch fresh data từ API để đảm bảo data chính xác (theo chuẩn Next.js 16)
  // Luôn fetch khi có resourceId để đảm bảo data mới nhất, không phụ thuộc vào variant
  const resourceId = sessionId || initialSession?.id
  const { data: sessionData } = useResourceDetailData({
    initialData: initialSession || ({} as SessionEditData),
    resourceId: resourceId || "",
    detailQueryKey: queryKeys.adminSessions.detail,
    resourceName: "sessions",
    fetchOnMount: !!resourceId, // Luôn fetch khi có resourceId để đảm bảo data fresh
  })

  // Sử dụng fresh data từ API nếu có, fallback về initial data
  const session = (sessionData as SessionEditData | null) || initialSession

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: (id) => apiRoutes.sessions.update(id),
    method: "PUT",
    resourceId: session?.id,
    messages: {
      successTitle: "Cập nhật session thành công",
      successDescription: "Session đã được cập nhật thành công.",
      errorTitle: "Lỗi cập nhật session",
    },
    navigation: {
      toDetail: variant === "page" && backUrl
        ? backUrl
        : variant === "page" && session?.id
          ? `/admin/sessions/${session.id}`
          : undefined,
      fallback: backUrl,
    },
    onSuccess: createResourceEditOnSuccess({
      queryClient,
      resourceId: session?.id,
      allQueryKey: queryKeys.adminSessions.all(),
      detailQueryKey: queryKeys.adminSessions.detail,
      resourceName: "sessions",
      getRecordName: (data) => (data.userEmail as string | undefined) || (data.userId as string | undefined),
      onSuccess,
    }),
  })

  if (!session?.id) {
    return null
  }

  const editFields = getBaseSessionFields(usersFromServer)
  const formSections = getSessionFormSections()

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
      resourceName="sessions"
      resourceId={session?.id}
      action="update"
    />
  )
}

