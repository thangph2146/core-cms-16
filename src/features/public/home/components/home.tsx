/**
 * Server Component: Home Page
 * 
 * Fetches data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { HomeClient } from "./home-client"

export interface HomeProps {
  // Có thể thêm props từ page nếu cần
}

export async function Home({}: HomeProps) {
  // Nếu cần fetch data, thêm vào đây
  // const data = await getHomeDataCached()

  return <HomeClient />
}

