import type { ResourceFormField, ResourceFormSection } from "@/features/admin/resources/components"
import { validateRoleName, validateDisplayName, validateDescription } from "./utils"
import { PERMISSIONS } from "@/lib/permissions"
import React from "react"
import { Shield, FileText, ToggleLeft, AlignLeft } from "lucide-react"

export interface RoleFormData {
  name: string
  displayName: string
  description?: string | null
  permissions?: string[]
  isActive?: boolean
  [key: string]: unknown
}

export function getAllPermissionsOptionGroups(): Array<{ label: string; options: Array<{ label: string; value: string }> }> {
  
  // Map resource names to Vietnamese labels
  const resourceLabels: Record<string, string> = {
    dashboard: "Dashboard",
    users: "Người dùng",
    posts: "Bài viết",
    categories: "Danh mục",
    tags: "Thẻ",
    comments: "Bình luận",
    roles: "Vai trò",
    messages: "Tin nhắn",
    notifications: "Thông báo",
    contact_requests: "Liên hệ",
    students: "Học sinh",
    settings: "Cài đặt",
  }

  // Map action names to Vietnamese labels
  const actionLabels: Record<string, string> = {
    view: "Xem",
    create: "Tạo",
    update: "Cập nhật",
    delete: "Xóa",
    publish: "Xuất bản",
    approve: "Duyệt",
    assign: "Gán",
    manage: "Quản lý",
  }

  // Group permissions by resource
  const grouped: Record<string, Array<{ label: string; value: string }>> = {}
  // Track unique permission values to avoid duplicates
  const seenValues = new Set<string>()

  Object.entries(PERMISSIONS).forEach(([_key, value]) => {
    const permissionValue = String(value)
    
    // Skip if we've already seen this permission value
    if (seenValues.has(permissionValue)) {
      return
    }
    
    const [resource, action] = permissionValue.split(":")
    if (!grouped[resource]) {
      grouped[resource] = []
    }
    
    // Format label: "Action - Resource" (e.g., "Xem - Người dùng")
    const resourceLabel = resourceLabels[resource] || resource
    const actionLabel = actionLabels[action] || action
    const label = `${actionLabel} - ${resourceLabel}`
    
    grouped[resource].push({
      label,
      value: permissionValue,
    })
    
    // Mark this permission value as seen
    seenValues.add(permissionValue)
  })

  // Sort options within each group and sort groups
  const sortedGroups = Object.entries(grouped)
    .map(([resource, options]) => ({
      label: resourceLabels[resource] || resource,
      options: options.sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return sortedGroups
}

function getAllPermissionsOptions(): Array<{ label: string; value: string }> {
  return getAllPermissionsOptionGroups().flatMap((group) => group.options)
}

export function getRoleFormSections(): ResourceFormSection[] {
  return [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về vai trò",
    },
    {
      id: "permissions",
      title: "Quyền truy cập",
      description: "Cấu hình các quyền cho vai trò này",
    },
  
  ]
}

export function getBaseRoleFields(
  permissionsOptions?: Array<{ label: string; value: string }>,
  useGroups = true
): ResourceFormField<RoleFormData>[] {
  // Use grouped permissions by default, fallback to flat if needed
  const permissionsOptionGroups = useGroups ? getAllPermissionsOptionGroups() : undefined
  const flatPermissionsOptions = permissionsOptions || getAllPermissionsOptions()

  return [
    {
      name: "name",
      label: "Tên vai trò",
      type: "text",
      placeholder: "vd: editor, author",
      required: true,
      description: "Tên vai trò (chỉ chữ thường, số, dấu gạch dưới và dấu gạch ngang)",
      validate: validateRoleName,
      icon: React.createElement(Shield, { className: "h-4 w-4" }),
      section: "basic",
    },
    {
      name: "displayName",
      label: "Tên hiển thị",
      type: "text",
      placeholder: "vd: Editor, Author",
      required: true,
      validate: validateDisplayName,
      icon: React.createElement(FileText, { className: "h-4 w-4" }),
      section: "basic",
    },
    {
      name: "description",
      label: "Mô tả",
      type: "textarea",
      placeholder: "Nhập mô tả về vai trò",
      validate: validateDescription,
      icon: React.createElement(AlignLeft, { className: "h-4 w-4" }),
      section: "basic",
    },
    {
      name: "permissions",
      label: "Quyền",
      type: "multiple-select",
      required: false,
      placeholder: "Chọn quyền",
      ...(permissionsOptionGroups
        ? { optionGroups: permissionsOptionGroups }
        : { options: flatPermissionsOptions }),
      description: "Chọn các quyền cho vai trò này",
      icon: React.createElement(Shield, { className: "h-4 w-4" }),
      section: "permissions",
    },
    {
      name: "isActive",
      label: "Trạng thái",
      description: "Bật/tắt để kích hoạt hoặc vô hiệu hóa vai trò",
      type: "switch",
      defaultValue: true,
      icon: React.createElement(ToggleLeft, { className: "h-4 w-4" }),
      section: "permissions",
    },
  ]
}

