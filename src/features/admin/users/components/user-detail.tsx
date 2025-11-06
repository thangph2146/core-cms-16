/**
 * Server Component: User Detail
 * 
 * Fetches user data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getUserDetailById } from "../server/cache"
import { serializeUserDetail } from "../server/helpers"
import { UserDetailClient } from "./user-detail.client"
import type { UserDetailData } from "./user-detail.client"

export interface UserDetailProps {
  userId: string
  backUrl?: string
}

export async function UserDetail({ userId, backUrl = "/admin/users" }: UserDetailProps) {
  const user = await getUserDetailById(userId)

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Không tìm thấy người dùng</p>
        </div>
      </div>
    )
  }

  return (
    <UserDetailClient
      userId={userId}
      user={serializeUserDetail(user) as UserDetailData}
      backUrl={backUrl}
    />
  )
}
