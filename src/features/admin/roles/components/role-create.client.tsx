"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { getBaseRoleFields, getRoleFormSections, type RoleFormData } from "../form-fields"

export interface RoleCreateClientProps {
  backUrl?: string
  permissions?: Array<{ label: string; value: string }>
}

export function RoleCreateClient({ backUrl = "/admin/roles", permissions: permissionsFromServer = [] }: RoleCreateClientProps) {
  const queryClient = useQueryClient()

  const handleBack = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all(), refetchType: "all" })
    await queryClient.refetchQueries({ queryKey: queryKeys.adminRoles.all(), type: "all" })
  }

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: apiRoutes.roles.create,
    method: "POST",
    messages: {
      successTitle: "Tạo vai trò thành công",
      successDescription: "Vai trò mới đã được tạo thành công.",
      errorTitle: "Lỗi tạo vai trò",
    },
    navigation: {
      toDetail: (response) =>
        response.data?.data?.id ? `/admin/roles/${response.data.data.id}` : backUrl,
      fallback: backUrl,
    },
    transformData: (data) => ({
      ...data,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all() })
    },
  })

  const createFields = getBaseRoleFields(permissionsFromServer)
  const formSections = getRoleFormSections()

  return (
    <ResourceForm<RoleFormData>
      data={null}
      fields={createFields}
      sections={formSections}
      onSubmit={handleSubmit}
      title="Tạo vai trò mới"
      description="Nhập thông tin để tạo vai trò mới"
      submitLabel="Tạo vai trò"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      onBack={handleBack}
      variant="page"
      showCard={false}
      className="max-w-[100%]"
      resourceName="roles"
      action="create"
    />
  )
}

