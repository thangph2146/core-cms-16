/**
 * Server Component: Session Create
 * 
 * Fetches users options với cached query, sau đó pass xuống client component
 * Pattern: Server Component (data fetching với cache) → Client Component (UI/interactions)
 */

import { SessionCreateClient } from "./session-create.client"
import { getActiveUsersForSelect } from "@/features/admin/users/server/queries"

export interface SessionCreateProps {
  backUrl?: string
}

export async function SessionCreate({ backUrl = "/admin/sessions" }: SessionCreateProps) {
  // Fetch users for userId select field using cached query
  const usersOptions = await getActiveUsersForSelect(100)

  return <SessionCreateClient backUrl={backUrl} users={usersOptions} />
}

