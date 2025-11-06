/**
 * Server Component: User Create
 * 
 * Fetches roles và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getRolesCached } from "../server/cache"
import { UserCreateClient } from "./user-create.client"

export interface UserCreateProps {
  backUrl?: string
}

export async function UserCreate({ backUrl = "/admin/users" }: UserCreateProps) {
  const roles = await getRolesCached()

  return <UserCreateClient backUrl={backUrl} roles={roles} />
}
