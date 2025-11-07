/**
 * Server Component: Session Detail
 * 
 * Fetches session data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getSessionDetailById } from "../server/cache"
import { serializeSessionDetail } from "../server/helpers"
import { SessionDetailClient } from "./session-detail.client"
import type { SessionDetailData } from "./session-detail.client"

export interface SessionDetailProps {
  sessionId: string
  backUrl?: string
}

export async function SessionDetail({ sessionId, backUrl = "/admin/sessions" }: SessionDetailProps) {
  const session = await getSessionDetailById(sessionId)

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Không tìm thấy session</p>
        </div>
      </div>
    )
  }

  return (
    <SessionDetailClient
      sessionId={sessionId}
      session={serializeSessionDetail(session) as SessionDetailData}
      backUrl={backUrl}
    />
  )
}

