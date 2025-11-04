/**
 * API Route: GET /api/roles - List roles
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

// Allow either ROLES_VIEW or USERS_CREATE permission
export const GET = createGetRoute(getRolesHandler, {
  permissions: [PERMISSIONS.ROLES_VIEW, PERMISSIONS.USERS_CREATE],
})

