/**
 * Server Component: About Page
 * 
 * Fetches data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { AboutClient } from "./about-client"

export interface AboutProps {
  // Có thể thêm props từ page nếu cần
}

export async function About({}: AboutProps) {
  // Nếu cần fetch data, thêm vào đây
  // const data = await getAboutDataCached()

  return <AboutClient />
}

