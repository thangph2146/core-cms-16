/**
 * API Route: GET /api/admin/posts - List posts
 * POST /api/admin/posts - Create post
 */
import { NextRequest, NextResponse } from "next/server"
import { listPostsCached } from "@/features/admin/posts/server/cache"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validatePagination, sanitizeSearchQuery } from "@/lib/api/validation"

async function getPostsHandler(req: NextRequest, _context: ApiRouteContext) {
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

  const activeFilters = Object.keys(columnFilters).length > 0 ? columnFilters : undefined
  const result = await listPostsCached({
    page: paginationValidation.page!,
    limit: paginationValidation.limit!,
    search: searchValidation.value || undefined,
    filters: activeFilters,
    status: status as "active" | "deleted" | "all",
  })

  return NextResponse.json(result)
}

export const GET = createGetRoute(getPostsHandler)

