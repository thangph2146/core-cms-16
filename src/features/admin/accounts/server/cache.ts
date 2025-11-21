/**
 * Cached Database Queries for Accounts
 * 
 * Sử dụng unstable_cache (Data Cache) kết hợp với React cache (Request Memoization)
 * - unstable_cache: Cache kết quả giữa các requests (Persisted Cache)
 * - React cache: Deduplicate requests trong cùng một render pass
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { unstable_cache } from "next/cache"
import { getCurrentUserProfile } from "./queries"
import type { AccountProfile } from "../types"

/**
 * Cache function: Get current user's account profile
 * Caching strategy: Cache by user ID
 */
export const getCurrentUserProfileCached = cache(
  async (userId: string): Promise<AccountProfile | null> => {
    return unstable_cache(
      async () => getCurrentUserProfile(userId),
      [`account-profile-${userId}`],
      { 
        tags: ['accounts', `account-${userId}`],
        revalidate: 3600 
      }
    )()
  }
)
