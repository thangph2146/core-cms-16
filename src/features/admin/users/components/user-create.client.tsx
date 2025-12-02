"use client"

import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { useToast } from "@/hooks/use-toast"
import { useRoles } from "../hooks/use-roles"
import { normalizeRoleIds, type Role } from "../utils"
import { getBaseUserFields, getPasswordField, type UserFormData } from "../form-fields"

export interface UserCreateClientProps {
  backUrl?: string
  roles?: Role[]
}

export function UserCreateClient({ backUrl = "/admin/users", roles: rolesFromServer }: UserCreateClientProps) {
  const { toast } = useToast()
  const { roles } = useRoles({ initialRoles: rolesFromServer })

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: apiRoutes.users.create,
    method: "POST",
    messages: {
      successTitle: "Tạo người dùng thành công",
      successDescription: "Người dùng mới đã được tạo thành công.",
      errorTitle: "Lỗi tạo người dùng",
    },
    navigation: {
      toDetail: (response) =>
        response.data?.data?.id ? `/admin/users/${response.data.data.id}` : backUrl,
      fallback: backUrl,
    },
    transformData: (data) => {
      const submitData: Record<string, unknown> = {
        ...data,
        roleIds: normalizeRoleIds(data.roleIds),
      }
      if (!submitData.email || !submitData.password) {
        toast({
          variant: "destructive",
          title: "Thiếu thông tin",
          description: "Email và mật khẩu là bắt buộc.",
        })
        throw new Error("Email và mật khẩu là bắt buộc")
      }
      return submitData
    },
  })

  const createFields = [
    {
      name: "email",
      label: "Email",
      type: "email" as const,
      placeholder: "email@example.com",
      required: true,
      validate: (value: unknown) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (typeof value !== "string" || !emailRegex.test(value)) {
          return { valid: false, error: "Email không hợp lệ" }
        }
        return { valid: true }
      },
    },
    getPasswordField(),
    ...getBaseUserFields(roles).slice(1),
  ]

  return (
    <ResourceForm<UserFormData>
      data={null}
      fields={createFields}
      onSubmit={handleSubmit}
      title="Tạo người dùng mới"
      description="Nhập thông tin để tạo người dùng mới"
      submitLabel="Tạo người dùng"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      variant="page"
      showCard={false}
      className="max-w-[100%]"
      resourceName="users"
      action="create"
    />
  )
}

