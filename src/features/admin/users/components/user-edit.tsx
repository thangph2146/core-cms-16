/**
 * Server Component: User Edit
 * 
 * Fetches user data và roles, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getUserDetailById, getRolesCached } from "../server/cache"
import { serializeUserDetail } from "../server/helpers"
import { UserEditClient } from "./user-edit.client"
import type { UserEditClientProps } from "./user-edit.client"

export interface UserEditProps {
  userId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export async function UserEdit({
  userId,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: UserEditProps) {
  const [user, roles] = await Promise.all([
    getUserDetailById(userId),
    getRolesCached(),
  ])

  if (!user) {
    return null
  }

  const userForEdit: UserEditClientProps["user"] = {
    ...serializeUserDetail(user),
    roles: user.roles,
  }

  return (
    <UserEditClient
      user={userForEdit}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      variant={variant}
      backUrl={backUrl}
      backLabel={backLabel}
      userId={userId}
      roles={roles}
    />
  )
}
