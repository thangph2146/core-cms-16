/**
 * API Route: GET /api/admin/roles - List roles
 * POST /api/admin/roles - Create role
 */
import { NextRequest } from "next/server"
import { listRolesCached } from "@/features/admin/roles/server/cache"
import { serializeRolesList } from "@/features/admin/roles/server/helpers"
import {
  createRole,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/roles/server/mutations"
import { CreateRoleSchema } from "@/features/admin/roles/server/schemas"
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validatePagination, sanitizeSearchQuery } from "@/lib/api/validation"
import { createSuccessResponse, createErrorResponse } from "@/lib/config"

async function getRolesHandler(req: NextRequest, _context: ApiRouteContext) {
  const searchParams = req.nextUrl.searchParams

  const paginationValidation = validatePagination({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  })

  if (!paginationValidation.valid) {
    return createErrorResponse(paginationValidation.error || "Invalid pagination parameters", { status: 400 })
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

  const result = await listRolesCached({
    page: paginationValidation.page,
    limit: paginationValidation.limit,
    search: searchValidation.value || undefined,
    filters: Object.keys(columnFilters).length > 0 ? columnFilters : undefined,
    status,
  })

  // Serialize result to match RolesResponse format
  const serialized = serializeRolesList(result)
  return createSuccessResponse({
    data: serialized.rows,
    pagination: {
      page: serialized.page,
      limit: serialized.limit,
      total: serialized.total,
      totalPages: serialized.totalPages,
    },
  })
}

async function postRolesHandler(req: NextRequest, context: ApiRouteContext) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return createErrorResponse("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.", { status: 400 })
  }

  // Validate body với Zod schema
  const validationResult = CreateRoleSchema.safeParse(body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return createErrorResponse(firstError?.message || "Dữ liệu không hợp lệ", { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const role = await createRole(ctx, validationResult.data)
    // Serialize role to client format (dates to strings)
    const serialized = {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions,
      isActive: role.isActive,
      createdAt: role.createdAt.toISOString(),
      deletedAt: role.deletedAt ? role.deletedAt.toISOString() : null,
    }
    return createSuccessResponse(serialized, { status: 201 })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return createErrorResponse(error.message || "Không thể tạo vai trò", { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return createErrorResponse(error.message || "Không tìm thấy", { status: 404 })
    }
    console.error("Error creating role:", error)
    return createErrorResponse("Đã xảy ra lỗi khi tạo vai trò", { status: 500 })
  }
}

export const GET = createGetRoute(getRolesHandler)
export const POST = createPostRoute(postRolesHandler)

