/**
 * Client Component: User Create Form
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
import { useRoles } from "../hooks/use-roles"
import { normalizeRoleIds, type Role } from "../utils"
import { getBaseUserFields, getPasswordField, type UserFormData } from "../form-fields"

export interface UserCreateClientProps {
  backUrl?: string
  roles?: Role[]
}

export function UserCreateClient({ backUrl = "/admin/users", roles: rolesFromServer }: UserCreateClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { roles } = useRoles({ initialRoles: rolesFromServer })

  const handleSubmit = async (data: Partial<UserFormData>) => {
    try {
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
        return { success: false, error: "Email và mật khẩu là bắt buộc" }
      }

      const response = await apiClient.post(apiRoutes.users.create, submitData)

      if (response.status === 201) {
        toast({
          variant: "success",
          title: "Tạo người dùng thành công",
          description: "Người dùng mới đã được tạo thành công.",
        })

        if (response.data?.data?.id) {
          router.push(`/admin/users/${response.data.data.id}`)
        } else {
          router.push("/admin/users")
        }

        return { success: true }
      }

      toast({
        variant: "destructive",
        title: "Tạo người dùng thất bại",
        description: "Không thể tạo người dùng. Vui lòng thử lại.",
      })
      return { success: false, error: "Không thể tạo người dùng" }
    } catch (error: unknown) {
      const errorMessage = extractAxiosErrorMessage(error, "Đã xảy ra lỗi khi tạo người dùng")

      toast({
        variant: "destructive",
        title: "Lỗi tạo người dùng",
        description: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

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
    ...getBaseUserFields(roles).slice(1), // Skip email field
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
    />
  )
}

