/**
 * API Route Wrapper
 * Kết hợp security, validation và permission checking
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth, getPermissions } from "@/lib/auth"
import type { Permission } from "@/lib/permissions"
import { canPerformAnyAction } from "@/lib/permissions"
import { withSecurity } from "./security"
import { logger } from "@/lib/config"

export interface ApiRouteOptions {
  /**
   * Required permissions (any one of these)
   */
  permissions?: Permission | Permission[]
  
  /**
   * Rate limit configuration
   */
  rateLimit?: "auth" | "write" | "read" | "default"
  
  /**
   * Whether authentication is required
   */
  requireAuth?: boolean
  
  /**
   * Whether to allow super admin to bypass permission checks
   * (default: true - super admin always has all permissions)
   */
  allowSuperAdmin?: boolean
}

/**
 * Wrapper cho API routes với security và permissions
 */
export function createApiRoute(
  handler: (
    req: NextRequest,
    context: {
      session: Awaited<ReturnType<typeof requireAuth>>
      permissions: Permission[]
      roles: Array<{ name: string }>
    },
    ...args: unknown[]
  ) => Promise<NextResponse>,
  options: ApiRouteOptions = {}
) {
  const {
    permissions,
    rateLimit = "default",
    requireAuth: requireAuthOption = true,
    allowSuperAdmin = true,
  } = options

  const wrappedHandler = async (
    req: NextRequest,
    ...args: unknown[]
  ): Promise<NextResponse> => {
    try {
      // Authentication check
      let session
      let permissionsList: Permission[] = []
      let roles: Array<{ name: string }> = []

      if (requireAuthOption) {
        try {
          session = await requireAuth()
          permissionsList = await getPermissions()

          const sessionWithRoles = session as typeof session & {
            roles?: Array<{ name: string }>
          }
          roles = sessionWithRoles?.roles || []
        } catch (error) {
          logger.warn("Unauthorized API access attempt", {
            path: req.nextUrl.pathname,
            method: req.method,
            error: error instanceof Error ? error.message : String(error),
          })
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
      }

      // Permission check
      if (permissions && requireAuthOption) {
        const requiredPermissions = Array.isArray(permissions)
          ? permissions
          : [permissions]

        // Super admin bypass
        if (allowSuperAdmin) {
          const isAuthorized = canPerformAnyAction(
            permissionsList,
            roles,
            requiredPermissions
          )

          if (!isAuthorized) {
            logger.warn("Forbidden API access attempt", {
              path: req.nextUrl.pathname,
              method: req.method,
              userId: session?.user?.id,
              requiredPermissions,
              userPermissions: permissionsList,
            })
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
          }
        } else {
          // Strict permission check without super admin bypass
          const hasPermission = requiredPermissions.some((perm) =>
            permissionsList.includes(perm)
          )
          if (!hasPermission) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
          }
        }
      }

      // Execute handler
      return await handler(
        req,
        {
          session: session!,
          permissions: permissionsList,
          roles,
        },
        ...args
      )
    } catch (error) {
      logger.error("API route error", {
        path: req.nextUrl.pathname,
        method: req.method,
        error: error instanceof Error ? error : new Error(String(error)),
      })

      // Don't expose internal errors in production
      const isProduction = process.env.NODE_ENV === "production"
      const errorMessage =
        error instanceof Error
          ? isProduction
            ? "Internal server error"
            : error.message
          : "Internal server error"

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  }

  // Wrap with security middleware
  return withSecurity(wrappedHandler, {
    endpointType: rateLimit,
    requireAuth: requireAuthOption,
  })
}

/**
 * Helper để tạo GET route với permissions
 */
export function createGetRoute(
  handler: Parameters<typeof createApiRoute>[0],
  options?: ApiRouteOptions
) {
  return createApiRoute(handler, { ...options, rateLimit: "read" })
}

/**
 * Helper để tạo POST route với permissions
 */
export function createPostRoute(
  handler: Parameters<typeof createApiRoute>[0],
  options?: ApiRouteOptions
) {
  return createApiRoute(handler, { ...options, rateLimit: "write" })
}

/**
 * Helper để tạo PUT route với permissions
 */
export function createPutRoute(
  handler: Parameters<typeof createApiRoute>[0],
  options?: ApiRouteOptions
) {
  return createApiRoute(handler, { ...options, rateLimit: "write" })
}

/**
 * Helper để tạo PATCH route với permissions
 */
export function createPatchRoute(
  handler: Parameters<typeof createApiRoute>[0],
  options?: ApiRouteOptions
) {
  return createApiRoute(handler, { ...options, rateLimit: "write" })
}

/**
 * Helper để tạo DELETE route với permissions
 */
export function createDeleteRoute(
  handler: Parameters<typeof createApiRoute>[0],
  options?: ApiRouteOptions
) {
  return createApiRoute(handler, { ...options, rateLimit: "write" })
}

