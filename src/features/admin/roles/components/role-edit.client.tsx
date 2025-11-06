/**
 * Client Component: Role Edit Form
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
import { getBaseRoleFields, getRoleFormSections, type RoleFormData } from "../form-fields"
import type { RoleRow } from "../types"

interface RoleEditData extends RoleRow {
  permissions: string[]
  [key: string]: unknown
}

export interface RoleEditClientProps {
  role: RoleEditData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
  roleId?: string
  permissions?: Array<{ label: string; value: string }>
}

export function RoleEditClient({
  role,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  roleId: _roleId,
  permissions: permissionsFromServer = [],
}: RoleEditClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (data: Partial<RoleEditData>) => {
    if (!role?.id) {
      return { success: false, error: "Không tìm thấy vai trò" }
    }

    try {
      const submitData: Record<string, unknown> = {
        ...data,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
      }

      // Prevent editing super_admin name (client-side check for UX)
      if (role.name === "super_admin" && submitData.name && submitData.name !== role.name) {
        toast({
          variant: "destructive",
          title: "Không thể chỉnh sửa",
          description: "Không thể thay đổi tên vai trò super_admin.",
        })
        return { success: false, error: "Không thể thay đổi tên vai trò super_admin" }
      }

      // Validation được xử lý bởi Zod ở server side
      const response = await apiClient.put(apiRoutes.roles.update(role.id), submitData)

      if (response.status === 200) {
        toast({
          variant: "success",
          title: "Cập nhật vai trò thành công",
          description: "Vai trò đã được cập nhật thành công.",
        })

        if (onSuccess) {
          onSuccess()
        } else if (variant === "page" && backUrl) {
          router.push(backUrl)
        } else if (variant === "page") {
          router.push(`/admin/roles/${role.id}`)
        }

        return { success: true }
      }

      toast({
        variant: "destructive",
        title: "Cập nhật vai trò thất bại",
        description: "Không thể cập nhật vai trò. Vui lòng thử lại.",
      })
      return { success: false, error: "Không thể cập nhật vai trò" }
    } catch (error: unknown) {
      const errorMessage = extractAxiosErrorMessage(error, "Đã xảy ra lỗi khi cập nhật vai trò")

      toast({
        variant: "destructive",
        title: "Lỗi cập nhật vai trò",
        description: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

  const editFields = getBaseRoleFields(permissionsFromServer).map((field) => {
    // Disable name field for super_admin
    if (field.name === "name" && role?.name === "super_admin") {
      return {
        ...field,
        disabled: true,
        description: "Không thể thay đổi tên vai trò super_admin",
      }
    }
    return field
  })
  const formSections = getRoleFormSections()

  if (!role) {
    return null
  }

  return (
    <ResourceForm<RoleFormData>
      data={role}
      fields={editFields}
      sections={formSections}
      onSubmit={handleSubmit}
      title="Chỉnh sửa vai trò"
      description="Cập nhật thông tin vai trò"
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

