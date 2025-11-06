/**
 * API Route: GET /api/admin/roles - List roles
 * POST /api/admin/roles - Create role
 */
import { NextRequest, NextResponse } from "next/server"
import { listRolesCached } from "@/features/admin/roles/server/cache"
import {
  createRole,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/roles/server/mutations"
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validatePagination, sanitizeSearchQuery } from "@/lib/api/validation"

async function getRolesHandler(req: NextRequest, _context: ApiRouteContext) {
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
  const filtersKey = activeFilters ? JSON.stringify(activeFilters) : ""
  const result = await listRolesCached(
    paginationValidation.page!,
    paginationValidation.limit!,
    searchValidation.value || "",
    filtersKey,
    status
  )

  return NextResponse.json(result)
}

async function postRolesHandler(req: NextRequest, context: ApiRouteContext) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const role = await createRole(ctx, body)
    return NextResponse.json({ data: role }, { status: 201 })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể tạo vai trò" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error creating role:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi tạo vai trò" }, { status: 500 })
  }
}

export const GET = createGetRoute(getRolesHandler)
export const POST = createPostRoute(postRolesHandler)

