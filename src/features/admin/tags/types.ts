import type { ResourceResponse, BaseResourceTableClientProps, ResourcePagination, BulkActionResult } from "@/features/admin/resources/types"

export interface TagRow {
  id: string
  name: string
  slug: string
  createdAt: string
  deletedAt: string | null
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TagsTableClientProps extends BaseResourceTableClientProps<TagRow> {}

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
  deletedAt: Date | null
}

export interface TagDetail extends ListedTag {
  updatedAt: Date
}

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

