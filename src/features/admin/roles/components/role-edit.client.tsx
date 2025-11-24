/**
 * Client Component: Role Edit Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit, useResourceNavigation, useResourceDetailData } from "@/features/admin/resources/hooks"
import { createResourceEditOnSuccess } from "@/features/admin/resources/utils"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
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
  role: initialRole,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  roleId,
  permissions: permissionsFromServer = [],
}: RoleEditClientProps) {
  const queryClient = useQueryClient()
  const { navigateBack } = useResourceNavigation({
    queryClient,
    invalidateQueryKey: queryKeys.adminRoles.all(),
  })

  // Fetch fresh data từ API để đảm bảo data chính xác (theo chuẩn Next.js 16)
  // Luôn fetch khi có resourceId để đảm bảo data mới nhất, không phụ thuộc vào variant
  const resourceId = roleId || initialRole?.id
  const { data: roleData } = useResourceDetailData({
    initialData: initialRole || ({} as RoleEditData),
    resourceId: resourceId || "",
    detailQueryKey: queryKeys.adminRoles.detail,
    resourceName: "roles",
    fetchOnMount: !!resourceId, // Luôn fetch khi có resourceId để đảm bảo data fresh
  })

  // Transform data từ API response sang form format
  // Note: Role API đã trả về permissions là string[] trực tiếp, không cần transform như posts
  // Sử dụng useMemo để tối ưu hóa và đảm bảo data được xử lý đúng cách
  const role = useMemo(() => {
    if (roleData) {
      return roleData as RoleEditData
    }
    return initialRole || null
  }, [roleData, initialRole])

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: (id) => apiRoutes.roles.update(id),
    method: "PUT",
    resourceId: role?.id,
    messages: {
      successTitle: "Cập nhật vai trò thành công",
      successDescription: "Vai trò đã được cập nhật thành công.",
      errorTitle: "Lỗi cập nhật vai trò",
    },
    navigation: {
      toDetail: variant === "page" && backUrl
        ? backUrl
        : variant === "page" && role?.id
          ? `/admin/roles/${role.id}`
          : undefined,
      fallback: backUrl,
    },
    transformData: (data) => {
      const submitData = {
        ...data,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
      }
      // Prevent editing super_admin name (client-side check for UX)
      if (role) {
        const roleName = (role as RoleRow).name
        if (roleName === "super_admin" && (submitData as RoleEditData).name && (submitData as RoleEditData).name !== roleName) {
          throw new Error("Không thể thay đổi tên vai trò super_admin")
        }
      }
      return submitData
    },
    onSuccess: createResourceEditOnSuccess({
      queryClient,
      resourceId: role?.id,
      allQueryKey: queryKeys.adminRoles.all(),
      detailQueryKey: queryKeys.adminRoles.detail,
      resourceName: "roles",
      getRecordName: (data) => data.displayName as string | undefined,
      onSuccess,
    }),
  })

  if (!role?.id) {
    return null
  }

  const editFields = getBaseRoleFields(permissionsFromServer).map((field) => {
    // Disable name field for super_admin
    if (field.name === "name" && role.name === "super_admin") {
      return {
        ...field,
        disabled: true,
        description: "Không thể thay đổi tên vai trò super_admin",
      }
    }
    return field
  })
  const formSections = getRoleFormSections()

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
      onBack={() => navigateBack(backUrl || `/admin/roles/${role?.id || ""}`)}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      showCard={variant === "page" ? false : true}
      className={variant === "page" ? "max-w-[100%]" : undefined}
      resourceName="roles"
      resourceId={role?.id}
      action="update"
    />
  )
}

