/**
 * API Route: GET /api/users - List users
 * POST /api/users - Create user
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, getPermissions } from "@/lib/api/auth-server"
import { PERMISSIONS } from "@/lib/permissions"
import { canPerformAction } from "@/lib/permissions-helpers"
import { listUsersCached } from "@/features/users/server/queries"
import {
  ApplicationError,
  createUser,
  type AuthContext,
} from "@/features/users/server/mutations"

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const permissions = await getPermissions()
    
    const sessionWithRoles = session as typeof session & {
      roles?: Array<{ name: string }>
    }
    const roles = sessionWithRoles?.roles || []

    // Check permission: users:view
    if (!canPerformAction(permissions, roles, PERMISSIONS.USERS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const status = (searchParams.get("status") as "active" | "deleted" | "all" | null) ?? "active"

    // Parse column filters
    const columnFilters: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      if (key.startsWith("filter[")) {
        const columnKey = key.replace("filter[", "").replace("]", "")
        columnFilters[columnKey] = value
      }
    })

    const activeFilters = Object.keys(columnFilters).length > 0 ? columnFilters : undefined
    const filtersKey = activeFilters ? JSON.stringify(activeFilters) : ""
    const result = await listUsersCached(page, limit, search || "", filtersKey, status)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const permissions = await getPermissions()
    
    const sessionWithRoles = session as typeof session & {
      roles?: Array<{ name: string }>
    }
    const roles = sessionWithRoles?.roles || []

    // Check permission: users:create
    if (!canPerformAction(permissions, roles, PERMISSIONS.USERS_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const ctx: AuthContext = {
      actorId: session.user?.id ?? "unknown",
      permissions,
      roles,
    }

    const user = await createUser(ctx, body)

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
