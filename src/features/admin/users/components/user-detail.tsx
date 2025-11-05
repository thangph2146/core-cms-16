/**
 * Server Component: User Detail
 * 
 * Fetches user data using cached server query and passes it to client component
 * for rendering UI with animations and interactions.
 * 
 * Pattern: Server Component (data fetching) -> Client Component (UI/interactions)
 */

import { getUserDetailById } from "../server/queries"
import { UserDetailClient } from "./user-detail.client"
import type { UserDetailData } from "./user-detail.client"

export interface UserDetailProps {
  userId: string
  backUrl?: string
}

/**
 * UserDetail Server Component
 * 
 * Fetches user data on the server using cached query and passes it to client component.
 * This ensures:
 * - Data is fetched on server (better SEO, faster initial load)
 * - Automatic request deduplication via React cache()
 * - Server-side caching for better performance
 */
export async function UserDetail({ userId, backUrl = "/admin/users" }: UserDetailProps) {
  // Fetch user data using cached server query
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

  // Transform user data to match UserDetailData format (serialize dates)
  const userForDetail: UserDetailData = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    bio: user.bio,
    phone: user.phone,
    address: user.address,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    emailVerified: user.emailVerified?.toISOString() || null,
    roles: user.roles,
  }

  // Pass data to client component for rendering
  return <UserDetailClient userId={userId} user={userForDetail} backUrl={backUrl} />
}
