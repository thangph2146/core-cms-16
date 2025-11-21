/**
 * Client Component: User Edit Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm, type ResourceFormField } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { isSuperAdmin } from "@/lib/permissions"
import { useRoles } from "../hooks/use-roles"
import { normalizeRoleIds, type Role } from "../utils"
import { getBaseUserFields, getPasswordEditField } from "../form-fields"
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
  user,
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
      // Remove password if empty
      if (!submitData.password || submitData.password === "") {
        delete submitData.password
      }
      // Không cho phép vô hiệu hóa super admin
      const PROTECTED_SUPER_ADMIN_EMAIL = "superadmin@hub.edu.vn"
      if (user?.email === PROTECTED_SUPER_ADMIN_EMAIL && submitData.isActive === false) {
        // Giữ nguyên isActive = true cho super admin
        submitData.isActive = true
      }
      return submitData
    },
    onSuccess: async () => {
      // Invalidate React Query cache để cập nhật danh sách users
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all(), refetchType: "all" })
      // Invalidate detail query nếu có userId
      const targetUserId = userId || user?.id
      if (targetUserId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.detail(targetUserId) })
      }
      // Refetch để đảm bảo data mới nhất
      await queryClient.refetchQueries({ queryKey: queryKeys.adminUsers.all(), type: "all" })
      
      onSuccess?.()
    },
  })

  if (!user?.id) {
    return null
  }

  const userForEdit: UserEditData | null = user
    ? {
        ...user,
        roleIds: user.roles && user.roles.length > 0 ? user.roles[0].id : "",
      }
    : null

  const roleDefaultValue = typeof userForEdit?.roleIds === "string" ? userForEdit.roleIds : ""
  const baseFields = getBaseUserFields(roles, roleDefaultValue) as unknown as ResourceFormField<UserEditData>[]
  
  // Điều chỉnh isActive field: disable nếu là super admin và đang active
  const PROTECTED_SUPER_ADMIN_EMAIL = "superadmin@hub.edu.vn"
  const isEditingSuperAdmin = user?.email === PROTECTED_SUPER_ADMIN_EMAIL
  const editFields = baseFields.map((field) => {
    if (field.name === "isActive" && isEditingSuperAdmin && user?.isActive) {
      return {
        ...field,
        disabled: true,
        description: "Không thể vô hiệu hóa tài khoản super admin",
      }
    }
    return field
  })
  
  const finalEditFields = [
    ...editFields,
    ...(isSuperAdminUser ? [getPasswordEditField() as unknown as ResourceFormField<UserEditData>] : []),
  ]

  return (
    <ResourceForm<UserEditData>
      data={userForEdit}
      fields={finalEditFields}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={onOpenChange}
      variant={variant}
      title="Chỉnh sửa người dùng"
      description="Cập nhật thông tin người dùng"
      submitLabel="Lưu thay đổi"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel={backLabel}
      onSuccess={onSuccess}
      showCard={false}
      className="max-w-[100%]"
    />
  )
}

