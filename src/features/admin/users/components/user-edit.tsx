"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ResourceForm, type ResourceFormField } from "@/features/admin/resources/components"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { isSuperAdmin } from "@/lib/permissions"
import { useToast } from "@/hooks/use-toast"
import { extractAxiosErrorMessage } from "@/lib/utils/api-utils"
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

export interface UserEditProps {
  user: UserEditData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
  userId?: string // For redirect after success in page mode
  roles?: Role[]
}

export function UserEdit({
  user,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  userId,
  roles: rolesFromServer,
}: UserEditProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const currentUserRoles = session?.roles || []
  const isSuperAdminUser = isSuperAdmin(currentUserRoles)
  const { toast } = useToast()
  const { roles } = useRoles({ initialRoles: rolesFromServer })

  const handleSubmit = async (data: Partial<UserEditData>) => {
    if (!user?.id) {
      return { success: false, error: "Không tìm thấy người dùng" }
    }

    try {
      const submitData: Record<string, unknown> = {
        ...data,
        roleIds: normalizeRoleIds(data.roleIds),
      }

      // Remove password if empty (don't change password)
      if (!submitData.password || submitData.password === "") {
        delete submitData.password
      }

      const response = await apiClient.put(apiRoutes.users.update(user.id), submitData)

      if (response.status === 200) {
        toast({
          variant: "success",
          title: "Cập nhật thành công",
          description: "Thông tin người dùng đã được cập nhật.",
        })
        onSuccess?.()
        // Redirect to detail page if in page mode and userId provided
        if (variant === "page" && userId) {
          router.push(`/admin/users/${userId}`)
          router.refresh()
        }
        return { success: true }
      }

      toast({
        variant: "destructive",
        title: "Cập nhật thất bại",
        description: "Không thể cập nhật người dùng. Vui lòng thử lại.",
      })
      return { success: false, error: "Không thể cập nhật người dùng" }
    } catch (error: unknown) {
      const errorMessage = extractAxiosErrorMessage(error, "Đã xảy ra lỗi khi cập nhật")

      toast({
        variant: "destructive",
        title: "Lỗi cập nhật",
        description: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

  const userForEdit: UserEditData | null = user
    ? {
        ...user,
        roleIds: user.roles && user.roles.length > 0 ? user.roles[0].id : "",
      }
    : null

  const roleDefaultValue = typeof userForEdit?.roleIds === "string" ? userForEdit.roleIds : ""
  const editFields = [
    ...(getBaseUserFields(roles, roleDefaultValue) as unknown as ResourceFormField<UserEditData>[]),
    ...(isSuperAdminUser ? [getPasswordEditField() as unknown as ResourceFormField<UserEditData>] : []),
  ]

  return (
    <ResourceForm<UserEditData>
      data={userForEdit}
      fields={editFields}
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

