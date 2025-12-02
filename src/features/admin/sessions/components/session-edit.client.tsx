"use client"

import { useMemo } from "react"
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

  const resourceId = sessionId || initialSession?.id
  const { data: sessionData } = useResourceDetailData({
    initialData: initialSession || ({} as SessionEditData),
    resourceId: resourceId || "",
    detailQueryKey: queryKeys.adminSessions.detail,
    resourceName: "sessions",
    fetchOnMount: !!resourceId,
  })
  const session = useMemo(() => {
    if (sessionData) {
      return sessionData as SessionEditData
    }
    return initialSession || null
  }, [sessionData, initialSession])

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

  const isDeleted = session.deletedAt !== null && session.deletedAt !== undefined
  const formDisabled = isDeleted && variant !== "page"
  
  const handleSubmitWrapper = async (data: Partial<SessionFormData>) => {
    if (isDeleted) {
      return { success: false, error: "Bản ghi đã bị xóa, không thể chỉnh sửa" }
    }
    return handleSubmit(data)
  }

  const editFields = getBaseSessionFields(usersFromServer)
  const formSections = getSessionFormSections()

  return (
    <ResourceForm<SessionFormData>
      data={session}
      fields={editFields.map(field => ({ ...field, disabled: formDisabled || field.disabled }))}
      sections={formSections}
      onSubmit={handleSubmitWrapper}
      title="Chỉnh sửa session"
      description={isDeleted ? "Bản ghi đã bị xóa, không thể chỉnh sửa" : "Cập nhật thông tin session"}
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

