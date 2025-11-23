/**
 * Server Component: Role Edit
 * 
 * Fetches role data và permissions, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getRoleById } from "../server/queries"
import { getAllPermissionsOptions } from "../server/queries"
import { serializeRoleDetail } from "../server/helpers"
import { RoleEditClient } from "./role-edit.client"
import type { RoleEditClientProps } from "./role-edit.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface RoleEditProps {
  roleId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export async function RoleEdit({
  roleId,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: RoleEditProps) {
  const [role, permissions] = await Promise.all([
    getRoleById(roleId),
    getAllPermissionsOptions(),
  ])

  if (!role) {
    return <NotFoundMessage resourceName="vai trò" />
  }

  const roleForEdit: RoleEditClientProps["role"] = {
    ...serializeRoleDetail(role),
  }

  return (
    <RoleEditClient
      role={roleForEdit}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      variant={variant}
      backUrl={backUrl}
      backLabel={backLabel}
      roleId={roleId}
      permissions={permissions}
    />
  )
}

