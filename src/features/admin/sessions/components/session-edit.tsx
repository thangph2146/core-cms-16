/**
 * Server Component: Session Edit
 * 
 * Fetches session data, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getSessionById } from "../server/queries"
import { serializeSessionDetail } from "../server/helpers"
import { SessionEditClient } from "./session-edit.client"
import type { SessionEditClientProps } from "./session-edit.client"
import { getActiveUsersForSelect } from "@/features/admin/users/server/queries"
import { NotFoundMessage } from "@/features/admin/resources/components"

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
    getSessionById(sessionId),
    getActiveUsersForSelect(100),
  ])

  if (!session) {
    return <NotFoundMessage resourceName="session" />
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

