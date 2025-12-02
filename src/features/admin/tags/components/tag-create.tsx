import { TagCreateClient } from "./tag-create.client"

export interface TagCreateProps {
  backUrl?: string
}

export async function TagCreate({ backUrl = "/admin/tags" }: TagCreateProps) {
  return <TagCreateClient backUrl={backUrl} />
}

