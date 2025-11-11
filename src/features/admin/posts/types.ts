import type { ResourceResponse, BaseResourceTableClientProps } from "@/features/admin/resources/types"

export interface PostRow {
  id: string
  title: string
  slug: string
  excerpt: string | null
  image: string | null
  published: boolean
  publishedAt: string | null
  createdAt: string
  deletedAt: string | null
  author: {
    id: string
    name: string | null
    email: string
  }
}

export interface PostsTableClientProps extends BaseResourceTableClientProps<PostRow> {}

export type PostsResponse = ResourceResponse<PostRow>

