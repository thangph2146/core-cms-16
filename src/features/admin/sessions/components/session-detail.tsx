/**
 * Server Component: Session Detail
 * 
 * Fetches session data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getSessionById } from "../server/queries"
import { serializeSessionDetail } from "../server/helpers"
import { SessionDetailClient } from "./session-detail.client"
import type { SessionDetailData } from "./session-detail.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface SessionDetailProps {
  sessionId: string
  backUrl?: string
}

export async function SessionDetail({ sessionId, backUrl = "/admin/sessions" }: SessionDetailProps) {
  const session = await getSessionById(sessionId)

  if (!session) {
    return <NotFoundMessage resourceName="session" />
  }

  return (
    <SessionDetailClient
      sessionId={sessionId}
      session={serializeSessionDetail(session) as SessionDetailData}
      backUrl={backUrl}
    />
  )
}

