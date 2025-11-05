/**
 * Server Component: Dashboard Stats
 * 
 * Fetches dashboard statistics using cached server query and passes it to client component.
 * 
 * Uses React cache() for automatic request deduplication and caching:
 * - Data fetching is cached automatically
 * - Multiple calls in the same render pass are deduplicated
 * - Better performance with server-side caching
 * 
 * Pattern: Server Component (with cache) → Client Component
 */

import { getDashboardStatsCached } from "./server/queries"
import { DashboardStatsClient } from "./dashboard-stats.client"

/**
 * DashboardStats Server Component
 * 
 * Fetches dashboard statistics on the server using cached query and passes it to client component.
 * This ensures:
 * - Data is fetched on server (better SEO, faster initial load)
 * - Automatic request deduplication via React cache()
 * - Server-side caching for better performance
 */
export async function DashboardStats() {
  // Fetch stats data using cached server query
  const stats = await getDashboardStatsCached()

  // Pass data to client component for rendering with animations
  return <DashboardStatsClient stats={stats} />
}
