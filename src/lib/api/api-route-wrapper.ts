/**
 * API Route Wrapper - Security, validation và permission checking
 * Tự động detect permissions từ API_ROUTE_PERMISSIONS config
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth, getPermissions } from "@/lib/auth"
import type { Permission } from "@/lib/permissions"
import { canPerformAnyAction } from "@/lib/permissions"
import { getApiRoutePermissions, type HttpMethod } from "@/lib/permissions"
import { withSecurity } from "./security"
import { logger, createErrorResponse } from "@/lib/config"
import type { ApiRouteContext } from "./types"

export interface ApiRouteOptions {
  /** Required permissions (nếu không truyền, sẽ auto-detect từ config) */
  permissions?: Permission | Permission[]
  /** Tự động detect permissions từ config (default: true) */
  autoDetectPermissions?: boolean
  /** Rate limit configuration */
  rateLimit?: "auth" | "write" | "read" | "default"
  /** Whether authentication is required */
  requireAuth?: boolean
  /** Allow super admin to bypass permission checks (default: true) */
  allowSuperAdmin?: boolean
}

export function createApiRoute(
  handler: (req: NextRequest, context: ApiRouteContext, ...args: unknown[]) => Promise<NextResponse>,
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
      let session
      let permissionsList: Permission[] = []
      let roles: Array<{ name: string }> = []

      // Authentication check
      if (requireAuthOption) {
        try {
          session = await requireAuth()
          permissionsList = await getPermissions()
          roles = (session as typeof session & { roles?: Array<{ name: string }> })?.roles || []
        } catch (error) {
          logger.warn("Unauthorized API access attempt", {
            path: req.nextUrl.pathname,
            method: req.method,
            error: error instanceof Error ? error.message : String(error),
          })
          return createErrorResponse("Unauthorized", { status: 401 })
        }
      }

      // Auto-detect permissions từ config
      let requiredPermissions: Permission[] = []
      if (permissions) {
        requiredPermissions = Array.isArray(permissions) ? permissions : [permissions]
      } else if (options.autoDetectPermissions !== false) {
        const detected = getApiRoutePermissions(req.nextUrl.pathname, req.method as HttpMethod)
        if (detected.length > 0) {
          requiredPermissions = detected
          logger.debug("Auto-detected API route permissions", {
            path: req.nextUrl.pathname,
            method: req.method,
            permissions: detected,
          })
        }
      }

      // Permission check
      if (requiredPermissions.length > 0 && requireAuthOption) {
        const isAuthorized = allowSuperAdmin
          ? canPerformAnyAction(permissionsList, roles, requiredPermissions)
          : requiredPermissions.some((perm) => permissionsList.includes(perm))

        if (!isAuthorized) {
          logger.warn("Forbidden API access attempt", {
            path: req.nextUrl.pathname,
            method: req.method,
            userId: session?.user?.id,
            requiredPermissions,
            userPermissions: permissionsList,
          })
          return createErrorResponse("Forbidden", { status: 403 })
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

      const isProduction = process.env.NODE_ENV === "production"
      const errorMessage =
        error instanceof Error
          ? isProduction
            ? "Internal server error"
            : error.message
          : "Internal server error"

      return createErrorResponse(errorMessage, { status: 500, error: error instanceof Error ? error.name : undefined })
    }
  }

  return withSecurity(wrappedHandler, {
    endpointType: rateLimit,
    requireAuth: requireAuthOption,
  })
}

// Helper functions
export const createGetRoute = (handler: Parameters<typeof createApiRoute>[0], options?: ApiRouteOptions) =>
  createApiRoute(handler, { ...options, rateLimit: "read" })

export const createPostRoute = (handler: Parameters<typeof createApiRoute>[0], options?: ApiRouteOptions) =>
  createApiRoute(handler, { ...options, rateLimit: "write" })

export const createPutRoute = (handler: Parameters<typeof createApiRoute>[0], options?: ApiRouteOptions) =>
  createApiRoute(handler, { ...options, rateLimit: "write" })

export const createPatchRoute = (handler: Parameters<typeof createApiRoute>[0], options?: ApiRouteOptions) =>
  createApiRoute(handler, { ...options, rateLimit: "write" })

export const createDeleteRoute = (handler: Parameters<typeof createApiRoute>[0], options?: ApiRouteOptions) =>
  createApiRoute(handler, { ...options, rateLimit: "write" })
