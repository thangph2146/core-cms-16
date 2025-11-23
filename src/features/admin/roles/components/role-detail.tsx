/**
 * Server Component: Role Detail
 * 
 * Fetches role data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getRoleById } from "../server/queries"
import { serializeRoleDetail } from "../server/helpers"
import { RoleDetailClient } from "./role-detail.client"
import type { RoleDetailData } from "./role-detail.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface RoleDetailProps {
  roleId: string
  backUrl?: string
}

export async function RoleDetail({ roleId, backUrl = "/admin/roles" }: RoleDetailProps) {
  const role = await getRoleById(roleId)

  if (!role) {
    return <NotFoundMessage resourceName="vai trò" />
  }

  return (
    <RoleDetailClient
      roleId={roleId}
      role={serializeRoleDetail(role) as RoleDetailData}
      backUrl={backUrl}
    />
  )
}

