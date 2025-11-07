/**
 * Server Component: Session Edit
 * 
 * Fetches session data, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getSessionDetailById } from "../server/cache"
import { serializeSessionDetail } from "../server/helpers"
import { SessionEditClient } from "./session-edit.client"
import type { SessionEditClientProps } from "./session-edit.client"
import { getActiveUsersForSelectCached } from "@/features/admin/users/server/cache"

export interface SessionEditProps {
  sessionId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export async function SessionEdit({
  sessionId,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: SessionEditProps) {
  const [session, usersOptions] = await Promise.all([
    getSessionDetailById(sessionId),
    getActiveUsersForSelectCached(100),
  ])

  if (!session) {
    return null
  }

  const sessionForEdit: SessionEditClientProps["session"] = {
    ...serializeSessionDetail(session),
  }

  return (
    <SessionEditClient
      session={sessionForEdit}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      variant={variant}
      backUrl={backUrl}
      backLabel={backLabel}
      sessionId={sessionId}
      users={usersOptions}
    />
  )
}

