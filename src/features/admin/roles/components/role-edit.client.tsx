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

  const resourceId = roleId || initialRole?.id
  const { data: roleData } = useResourceDetailData({
    initialData: initialRole || ({} as RoleEditData),
    resourceId: resourceId || "",
    detailQueryKey: queryKeys.adminRoles.detail,
    resourceName: "roles",
    fetchOnMount: !!resourceId,
  })
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

  const isDeleted = role.deletedAt !== null && role.deletedAt !== undefined
  const formDisabled = isDeleted && variant !== "page"
  
  const handleSubmitWrapper = async (data: Partial<RoleFormData>) => {
    if (isDeleted) {
      return { success: false, error: "Bản ghi đã bị xóa, không thể chỉnh sửa" }
    }
    return handleSubmit(data)
  }

  const editFields = getBaseRoleFields(permissionsFromServer).map((field) => {
    if (field.name === "name" && role.name === "super_admin") {
      return {
        ...field,
        disabled: true,
        description: "Không thể thay đổi tên vai trò super_admin",
      }
    }
    if (formDisabled) {
      return { ...field, disabled: true }
    }
    return field
  })
  const formSections = getRoleFormSections()

  return (
    <ResourceForm<RoleFormData>
      data={role}
      fields={editFields}
      sections={formSections}
      onSubmit={handleSubmitWrapper}
      title="Chỉnh sửa vai trò"
      description={isDeleted ? "Bản ghi đã bị xóa, không thể chỉnh sửa" : "Cập nhật thông tin vai trò"}
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

