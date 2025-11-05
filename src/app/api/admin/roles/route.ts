/**
 * API Route: GET /api/admin/roles - List roles (admin)
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"
import { PERMISSIONS } from "@/lib/permissions"
import { createGetRoute } from "@/lib/api/api-route-wrapper"

async function getRolesHandler(
  _req: NextRequest,
  _context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>>
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  }
) {
  const rolesList = await prisma.role.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      displayName: true,
      description: true,
    },
    orderBy: {
      displayName: "asc",
    },
  })

  return NextResponse.json({ data: rolesList })
}

// Allow ROLES_VIEW, USERS_CREATE, or USERS_VIEW permission
// USERS_VIEW is included because roles are used for filtering in users table
export const GET = createGetRoute(getRolesHandler, {
  permissions: [
    PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_VIEW, // Allow users who can view users to also see roles for filtering
  ],
})

