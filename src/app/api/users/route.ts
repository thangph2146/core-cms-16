/**
 * API Route: GET /api/users - List users
 * POST /api/users - Create user
 */
import { NextRequest, NextResponse } from "next/server"
import { PERMISSIONS } from "@/lib/permissions"
import { listUsersCached } from "@/features/users/server/queries"
import {
  createUser,
  type AuthContext,
} from "@/features/users/server/mutations"
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import { validatePagination, sanitizeSearchQuery } from "@/lib/api/validation"

async function getUsersHandler(
  req: NextRequest,
  _context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>>
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  }
) {

  // Parse và validate query params
  const searchParams = req.nextUrl.searchParams
  
  const paginationValidation = validatePagination({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  })
  
  if (!paginationValidation.valid) {
    return NextResponse.json({ error: paginationValidation.error }, { status: 400 })
  }

  const page = paginationValidation.page!
  const limit = paginationValidation.limit!

  // Validate và sanitize search query
  const searchParam = searchParams.get("search") || ""
  const searchValidation = sanitizeSearchQuery(searchParam, 200)
  const search = searchValidation.value || ""

  // Validate status
  const statusParam = searchParams.get("status") || "active"
  const status = statusParam === "deleted" || statusParam === "all" ? statusParam : "active"

  // Parse và sanitize column filters
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
  const result = await listUsersCached(page, limit, search, filtersKey, status)

  return NextResponse.json(result)
}

async function postUsersHandler(
  req: NextRequest,
  context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>>
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  }
) {
  const body = await req.json()
  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  const user = await createUser(ctx, body)

  return NextResponse.json({ data: user }, { status: 201 })
}

export const GET = createGetRoute(getUsersHandler, {
  permissions: PERMISSIONS.USERS_VIEW,
})

export const POST = createPostRoute(postUsersHandler, {
  permissions: PERMISSIONS.USERS_CREATE,
})
