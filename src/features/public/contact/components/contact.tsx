/**
 * Server Component: Contact Page
 * 
 * Fetches data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { ContactClient } from "./contact-client"

export interface ContactProps {
  // Có thể thêm props từ page nếu cần
}

export async function Contact({}: ContactProps) {
  // Nếu cần fetch data, thêm vào đây
  // const data = await getContactDataCached()

  return <ContactClient />
}

