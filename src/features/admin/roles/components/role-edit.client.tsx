/**
 * Client Component: Role Edit Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import * as React from "react"
import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { getBaseRoleFields, getRoleFormSections, getAllPermissionsOptionGroups, type RoleFormData } from "../form-fields"
import type { RoleRow } from "../types"
import { logger } from "@/lib/config/logger"

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
  // Capture role for use in hook callbacks
  const currentRole = role

  // Get grouped permissions để kiểm tra
  const permissionsGroups = getAllPermissionsOptionGroups()
  
  // Get all options from groups
  const allPermissionsOptions = permissionsFromServer.length > 0 
    ? permissionsFromServer 
    : permissionsGroups.flatMap((group) => group.options)
  
  // Debug: Kiểm tra duplicate (chỉ log khi có vấn đề)
  React.useEffect(() => {
    logger.debug("=== DEBUG allPermissionsOptions (RoleEdit) ===", {
      totalOptions: allPermissionsOptions.length,
      source: permissionsFromServer.length > 0 ? "fromServer" : "fromGroups",
      allOptions: allPermissionsOptions,
    })
    
    // Check for duplicate values
    const valueCounts = new Map<string, number>()
    allPermissionsOptions.forEach((opt) => {
      const count = valueCounts.get(opt.value) || 0
      valueCounts.set(opt.value, count + 1)
    })
    
    const duplicates = Array.from(valueCounts.entries()).filter(([_, count]) => count > 1)
    if (duplicates.length > 0) {
      logger.warn("⚠️ Duplicate permission values found (RoleEdit)", {
        duplicates: duplicates.map(([value, count]) => ({ value, count })),
        totalDuplicates: duplicates.length,
      })
    }
    
    logger.debug("=== DEBUG permissionsGroups (RoleEdit) ===", {
      totalGroups: permissionsGroups.length,
      groups: permissionsGroups.map((g, i) => ({ 
        index: i, 
        label: g.label, 
        optionsCount: g.options.length,
        options: g.options.map(opt => ({ value: opt.value, label: opt.label }))
      })),
    })
    
    // Check for duplicate group labels
    const labelCounts = new Map<string, number>()
    permissionsGroups.forEach((group) => {
      const count = labelCounts.get(group.label) || 0
      labelCounts.set(group.label, count + 1)
    })
    
    const duplicateLabels = Array.from(labelCounts.entries()).filter(([_, count]) => count > 1)
    if (duplicateLabels.length > 0) {
      logger.warn("⚠️ Duplicate group labels found (RoleEdit)", {
        duplicateLabels: duplicateLabels.map(([label, count]) => ({ label, count })),
        totalDuplicateLabels: duplicateLabels.length,
      })
    }
  }, [allPermissionsOptions, permissionsGroups, permissionsFromServer])

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: (id) => apiRoutes.roles.update(id),
    method: "PUT",
    resourceId: currentRole?.id,
    messages: {
      successTitle: "Cập nhật vai trò thành công",
      successDescription: "Vai trò đã được cập nhật thành công.",
      errorTitle: "Lỗi cập nhật vai trò",
    },
    navigation: {
      toDetail: variant === "page" && backUrl
        ? backUrl
        : variant === "page" && currentRole?.id
          ? `/admin/roles/${currentRole.id}`
          : undefined,
      fallback: backUrl,
    },
    transformData: (data) => {
      const submitData = {
        ...data,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
      }
      // Prevent editing super_admin name (client-side check for UX)
      if (currentRole) {
        const roleName = (currentRole as RoleRow).name
        if (roleName === "super_admin" && (submitData as RoleEditData).name && (submitData as RoleEditData).name !== roleName) {
          // Throw error to be caught by hook's error handler
          throw new Error("Không thể thay đổi tên vai trò super_admin")
        }
      }
      return submitData
    },
    onSuccess: async () => {
      if (onSuccess) {
        onSuccess()
      }
    },
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
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      showCard={variant === "page" ? false : true}
      className={variant === "page" ? "max-w-[100%]" : undefined}
    />
  )
}

