/**
 * Client Component: Account Edit Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { ResourceForm, type ResourceFormField } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { getAccountFields, getAccountFormSections, type AccountFormData } from "../form-fields"
import type { AccountProfile } from "../types"

export interface AccountEditClientProps {
  account: AccountProfile | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  onCancel?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export function AccountEditClient({
  account,
  open = true,
  onOpenChange,
  onSuccess,
  onCancel,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: AccountEditClientProps) {
  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: apiRoutes.accounts.update,
    method: "PUT",
    resourceId: account?.id,
    messages: {
      successTitle: "Cập nhật thành công",
      successDescription: "Thông tin tài khoản đã được cập nhật.",
      errorTitle: "Lỗi cập nhật",
    },
    navigation: {
      fallback: backUrl,
    },
    transformData: (data) => {
      const submitData: Record<string, unknown> = {
        ...data,
      }
      // Remove password if empty
      if (!submitData.password || submitData.password === "") {
        delete submitData.password
      }
      return submitData
    },
    onSuccess: async () => {
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  if (!account?.id) {
    return null
  }

  const accountForEdit: AccountFormData = {
    name: account.name,
    bio: account.bio,
    phone: account.phone,
    address: account.address,
    avatar: account.avatar,
  }

  const editFields = getAccountFields() as ResourceFormField<AccountFormData>[]
  const formSections = getAccountFormSections()

  return (
    <ResourceForm<AccountFormData>
      data={accountForEdit}
      fields={editFields}
      sections={formSections}
      onSubmit={handleSubmit}
      title="Chỉnh sửa thông tin tài khoản"
      description="Cập nhật thông tin cá nhân của bạn"
      submitLabel="Lưu thay đổi"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel={backLabel}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      onCancel={onCancel}
      showCard={variant === "page" ? false : true}
      className={variant === "page" ? "max-w-[100%]" : undefined}
    />
  )
}

