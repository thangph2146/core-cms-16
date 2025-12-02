import { CategoryCreateClient } from "./category-create.client"

export interface CategoryCreateProps {
  backUrl?: string
}

export async function CategoryCreate({ backUrl = "/admin/categories" }: CategoryCreateProps) {
  return <CategoryCreateClient backUrl={backUrl} />
}

