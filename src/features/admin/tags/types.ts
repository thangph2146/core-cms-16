import type { ResourceResponse, BaseResourceTableClientProps, ResourcePagination, BulkActionResult } from "@/features/admin/resources/types"

export interface TagRow {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt?: string // Optional để hỗ trợ cache comparison
  deletedAt: string | null
}

export type TagsTableClientProps = BaseResourceTableClientProps<TagRow>

export type TagsResponse = ResourceResponse<TagRow>

export interface ListTagsInput {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string>
  status?: "active" | "deleted" | "all"
}

export interface ListedTag {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export type TagDetail = ListedTag

export interface ListTagsResult {
  data: ListedTag[]
  pagination: ResourcePagination
}

export interface CreateTagInput {
  name: string
  slug: string
}

export interface UpdateTagInput {
  name?: string
  slug?: string
}

export type { BulkActionResult }

