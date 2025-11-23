/**
 * Server Component: Dashboard Stats
 * 
 * Fetches dashboard statistics using non-cached server query and passes it to client component.
 * 
 * Theo chuẩn Next.js 16: không cache admin data - luôn fetch fresh data
 * 
 * Pattern: Server Component (non-cached) → Client Component
 */

import { getDashboardStats } from "./server/queries"
import { DashboardStatsClient } from "./dashboard-stats.client"

/**
 * DashboardStats Server Component
 * 
 * Fetches dashboard statistics on the server using non-cached query and passes it to client component.
 * This ensures:
 * - Data is fetched on server (better SEO, faster initial load)
 * - Always fresh data (theo chuẩn Next.js 16: không cache admin data)
 */
export async function DashboardStats() {
  // Fetch stats data using non-cached server query (theo chuẩn Next.js 16)
  const stats = await getDashboardStats()

  // Pass data to client component for rendering with animations
  return <DashboardStatsClient stats={stats} />
}
