"use client"

import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit, useResourceDetailData } from "@/features/admin/resources/hooks"
import { createResourceEditOnSuccess } from "@/features/admin/resources/utils"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
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
  contactRequest: initialContactRequest,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  contactRequestId,
  usersOptions = [],
}: ContactRequestEditClientProps) {
  const queryClient = useQueryClient()

  const resourceId = contactRequestId || initialContactRequest?.id
  const { data: contactRequestData } = useResourceDetailData({
    initialData: initialContactRequest || ({} as ContactRequestEditData),
    resourceId: resourceId || "",
    detailQueryKey: queryKeys.adminContactRequests.detail,
    resourceName: "contact-requests",
    fetchOnMount: !!resourceId,
  })
  const transformContactRequestData = (data: unknown): ContactRequestEditData | null => {
    if (!data || typeof data !== "object") return null
    
    const contactRequest = data as Record<string, unknown>
    const transformed: ContactRequestEditData = {
      ...contactRequest,
    } as ContactRequestEditData

    if (contactRequest.assignedTo && typeof contactRequest.assignedTo === "object" && contactRequest.assignedTo !== null && "id" in contactRequest.assignedTo) {
      transformed.assignedToId = String(contactRequest.assignedTo.id)
    } else if (contactRequest.assignedToId !== undefined && contactRequest.assignedToId !== null) {
      transformed.assignedToId = String(contactRequest.assignedToId)
    } else {
      transformed.assignedToId = null
    }

    return transformed
  }

  const contactRequest = useMemo(() => {
    if (contactRequestData) {
      return transformContactRequestData(contactRequestData)
    }
    return initialContactRequest || null
  }, [contactRequestData, initialContactRequest])

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: (id) => apiRoutes.contactRequests.update(id),
    method: "PUT",
    resourceId: contactRequest?.id,
    messages: {
      successTitle: "Cập nhật yêu cầu liên hệ thành công",
      successDescription: "Yêu cầu liên hệ đã được cập nhật thành công.",
      errorTitle: "Lỗi cập nhật yêu cầu liên hệ",
    },
    navigation: {
      toDetail: variant === "page" && backUrl
        ? backUrl
        : variant === "page" && contactRequest?.id
          ? `/admin/contact-requests/${contactRequest.id}`
          : undefined,
      fallback: backUrl,
    },
    onSuccess: createResourceEditOnSuccess({
      queryClient,
      resourceId: contactRequest?.id,
      allQueryKey: queryKeys.adminContactRequests.all(),
      detailQueryKey: queryKeys.adminContactRequests.detail,
      resourceName: "contact-requests",
      getRecordName: (data) => (data.name as string | undefined) || (data.email as string | undefined),
      onSuccess,
    }),
  })

  if (!contactRequest?.id) {
    return null
  }

  const isDeleted = contactRequest.deletedAt !== null && contactRequest.deletedAt !== undefined
  const formDisabled = isDeleted && variant !== "page"
  
  const handleSubmitWrapper = async (data: Partial<ContactRequestFormData>) => {
    if (isDeleted) {
      return { success: false, error: "Bản ghi đã bị xóa, không thể chỉnh sửa" }
    }
    return handleSubmit(data)
  }

  const editFields = getBaseContactRequestFields(usersOptions)

  return (
    <ResourceForm<ContactRequestFormData>
      data={contactRequest}
      fields={editFields.map(field => ({ ...field, disabled: formDisabled || field.disabled }))}
      onSubmit={handleSubmitWrapper}
      title="Chỉnh sửa yêu cầu liên hệ"
      description={isDeleted ? "Bản ghi đã bị xóa, không thể chỉnh sửa" : `Cập nhật thông tin yêu cầu liên hệ: ${contactRequest?.subject || ""}`}
      submitLabel="Cập nhật"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel={backLabel}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      showCard={variant === "page" ? false : true}
      className={variant === "page" ? "max-w-[100%]" : "max-w-[800px]"}
      resourceName="contact-requests"
      resourceId={contactRequest?.id}
      action="update"
    />
  )
}

