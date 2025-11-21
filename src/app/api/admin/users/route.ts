/**
 * API Route: GET /api/admin/users - List users
 * POST /api/admin/users - Create user
 */
import { NextRequest, NextResponse } from "next/server"
import { listUsersCached } from "@/features/admin/users/server/cache"
import {
  createUser,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/users/server/mutations"
import { createUserSchema } from "@/features/admin/users/server/validation"
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validatePagination, sanitizeSearchQuery } from "@/lib/api/validation"

async function getUsersHandler(req: NextRequest, _context: ApiRouteContext) {
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
  const result = await listUsersCached({
    page: paginationValidation.page!,
    limit: paginationValidation.limit!,
    search: searchValidation.value || undefined,
    filters: activeFilters,
    status: status as "active" | "deleted" | "all",
  })

  return NextResponse.json(result)
}

async function postUsersHandler(req: NextRequest, context: ApiRouteContext) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  // Validate body với Zod schema
  const validationResult = createUserSchema.safeParse(body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return NextResponse.json({ error: firstError?.message || "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const user = await createUser(ctx, validationResult.data)
    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể tạo người dùng" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi tạo người dùng" }, { status: 500 })
  }
}

export const GET = createGetRoute(getUsersHandler)
export const POST = createPostRoute(postUsersHandler)
