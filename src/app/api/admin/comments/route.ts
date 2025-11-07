/**
 * API Route: GET /api/admin/comments - List comments
 */
import { NextRequest, NextResponse } from "next/server"
import { listCommentsCached } from "@/features/admin/comments/server/cache"
import { serializeCommentsList } from "@/features/admin/comments/server/helpers"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validatePagination, sanitizeSearchQuery } from "@/lib/api/validation"

async function getCommentsHandler(req: NextRequest, _context: ApiRouteContext) {
  const searchParams = req.nextUrl.searchParams

  const paginationValidation = validatePagination({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  })

  if (!paginationValidation.valid) {
    return NextResponse.json({ error: paginationValidation.error }, { status: 400 })
  }

  const searchValidation = sanitizeSearchQuery(searchParams.get("search") || "", 200)
  const statusParam = searchParams.get("status") || "active"
  const status = statusParam === "deleted" || statusParam === "all" ? statusParam : "active"

  const columnFilters: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key.startsWith("filter[")) {
      const columnKey = key.replace("filter[", "").replace("]", "")
      const sanitizedValue = sanitizeSearchQuery(value, 100)
      if (sanitizedValue.valid && sanitizedValue.value) {
        columnFilters[columnKey] = sanitizedValue.value
      }
    }
  })

  const filters: {
    approved?: boolean
    authorId?: string
    postId?: string
    deleted?: boolean
  } = {}

  if (status === "deleted") {
    filters.deleted = true
  } else if (status === "active") {
    filters.deleted = false
  }

  // Parse approved filter if provided
  if (columnFilters.approved) {
    filters.approved = columnFilters.approved === "true"
  }

  if (columnFilters.authorId) {
    filters.authorId = columnFilters.authorId
  }

  if (columnFilters.postId) {
    filters.postId = columnFilters.postId
  }

  const result = await listCommentsCached({
    page: paginationValidation.page,
    limit: paginationValidation.limit,
    search: searchValidation.value || undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  })

  // Serialize result to match CommentsResponse format
  const serialized = serializeCommentsList(result)
  return NextResponse.json({
    data: serialized.rows,
    pagination: {
      page: serialized.page,
      limit: serialized.limit,
      total: serialized.total,
      totalPages: serialized.totalPages,
    },
  })
}

export const GET = createGetRoute(getCommentsHandler)

