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
  updatedAt?: string // Optional để hỗ trợ cache comparison
  deletedAt: string | null
  author: {
    id: string
    name: string | null
    email: string
  }
  categories?: Array<{
    id: string
    name: string
  }>
  tags?: Array<{
    id: string
    name: string
  }>
}

export type PostsTableClientProps = BaseResourceTableClientProps<PostRow>

export type PostsResponse = ResourceResponse<PostRow>

