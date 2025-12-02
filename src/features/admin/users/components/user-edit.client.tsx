"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm, type ResourceFormField } from "@/features/admin/resources/components"
import { useResourceFormSubmit, useResourceDetailData } from "@/features/admin/resources/hooks"
import { createResourceEditOnSuccess } from "@/features/admin/resources/utils"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { isSuperAdmin } from "@/lib/permissions"
import { useRoles } from "../hooks/use-roles"
import { normalizeRoleIds, type Role } from "../utils"
import { getBaseUserFields, getPasswordEditField } from "../form-fields"
import { PROTECTED_SUPER_ADMIN_EMAIL } from "../constants"
import type { UserRow } from "../types"

interface UserEditData extends UserRow {
  avatar?: string | null
  bio?: string | null
  phone?: string | null
  address?: string | null
  roleIds?: string[] | string
  password?: string
  [key: string]: unknown
}

export interface UserEditClientProps {
  user: UserEditData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
  userId?: string
  roles?: Role[]
}

export function UserEditClient({
  user: initialUser,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  userId,
  roles: rolesFromServer,
}: UserEditClientProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const currentUserRoles = session?.roles || []
  const isSuperAdminUser = isSuperAdmin(currentUserRoles)
  const { roles } = useRoles({ initialRoles: rolesFromServer })

  const resourceId = userId || initialUser?.id
  const { data: userData } = useResourceDetailData({
    initialData: initialUser || ({} as UserEditData),
    resourceId: resourceId || "",
    detailQueryKey: queryKeys.adminUsers.detail,
    resourceName: "users",
    fetchOnMount: !!resourceId,
  })
  const user = useMemo(() => {
    if (userData) {
      const userDataTyped = userData as UserEditData
      return {
        ...userDataTyped,
        roleIds: userDataTyped.roles && userDataTyped.roles.length > 0 ? userDataTyped.roles[0].id : "",
      }
    }
    return initialUser || null
  }, [userData, initialUser])

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: (id) => apiRoutes.users.update(id),
    method: "PUT",
    resourceId: user?.id,
    messages: {
      successTitle: "Cập nhật thành công",
      successDescription: "Thông tin người dùng đã được cập nhật.",
      errorTitle: "Lỗi cập nhật",
    },
    navigation: {
      toDetail: variant === "page" && userId ? `/admin/users/${userId}` : undefined,
      fallback: backUrl,
    },
    transformData: (data) => {
      const submitData: Record<string, unknown> = {
        ...data,
        roleIds: normalizeRoleIds(data.roleIds),
      }
      if (!submitData.password || submitData.password === "") {
        delete submitData.password
      }
      if (user?.email === PROTECTED_SUPER_ADMIN_EMAIL && submitData.isActive === false) {
        submitData.isActive = true
      }
      return submitData
    },
    onSuccess: createResourceEditOnSuccess({
      queryClient,
      resourceId: userId || user?.id,
      allQueryKey: queryKeys.adminUsers.all(),
      detailQueryKey: queryKeys.adminUsers.detail,
      resourceName: "users",
      getRecordName: (responseData) => (responseData?.name as string | undefined) || (responseData?.email as string | undefined),
      onSuccess,
    }),
  })

  if (!user?.id) {
    return null
  }

  const isDeleted = user.deletedAt !== null && user.deletedAt !== undefined
  const formDisabled = isDeleted && variant !== "page"
  
  const handleSubmitWrapper = async (data: Partial<UserEditData>) => {
    if (isDeleted) {
      return { success: false, error: "Bản ghi đã bị xóa, không thể chỉnh sửa" }
    }
    return handleSubmit(data)
  }

  const roleDefaultValue = typeof user?.roleIds === "string" ? user.roleIds : ""
  const baseFields = getBaseUserFields(roles, roleDefaultValue) as unknown as ResourceFormField<UserEditData>[]
  const isEditingSuperAdmin = user?.email === PROTECTED_SUPER_ADMIN_EMAIL
  const editFields = baseFields.map((field) => {
    if (field.name === "isActive" && isEditingSuperAdmin && user?.isActive) {
      return {
        ...field,
        disabled: true,
        description: "Không thể vô hiệu hóa tài khoản super admin",
      }
    }
    if (formDisabled) {
      return { ...field, disabled: true }
    }
    return field
  })
  
  const finalEditFields = [
    ...editFields,
    ...(isSuperAdminUser && !formDisabled ? [getPasswordEditField() as unknown as ResourceFormField<UserEditData>] : []),
  ]

  return (
    <ResourceForm<UserEditData>
      data={user}
      fields={finalEditFields}
      onSubmit={handleSubmitWrapper}
      open={open}
      onOpenChange={onOpenChange}
      variant={variant}
      title="Chỉnh sửa người dùng"
      description={isDeleted ? "Bản ghi đã bị xóa, không thể chỉnh sửa" : "Cập nhật thông tin người dùng"}
      submitLabel="Lưu thay đổi"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel={backLabel}
      onSuccess={onSuccess}
      showCard={false}
      className="max-w-[100%]"
      resourceName="users"
      resourceId={user?.id}
      action="update"
    />
  )
}

