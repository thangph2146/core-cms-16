/**
 * Server Component: Tag Create
 * 
 * Pass props xuống client component
 * Pattern: Server Component → Client Component (UI/interactions)
 */

import { TagCreateClient } from "./tag-create.client"

export interface TagCreateProps {
  backUrl?: string
}

export async function TagCreate({ backUrl = "/admin/tags" }: TagCreateProps) {
  return <TagCreateClient backUrl={backUrl} />
}

