/**
 * API Route Helpers - Utilities để extract và generate API routes từ ROUTE_CONFIG
 */

import { stripApiBase } from "@/lib/config/api-paths"
import { ROUTE_CONFIG, type RoutePermissionConfig } from "./route-config"
import type { HttpMethod } from "./route-config"

/**
 * Get all API routes từ ROUTE_CONFIG
 */
export function getApiRoutes(): RoutePermissionConfig[] {
  return ROUTE_CONFIG.filter((config) => config.type === "api")
}

/**
 * Get admin API routes cho một resource name
 */
export function getResourceAdminApiRoutes(resourceName: string): RoutePermissionConfig[] {
  return ROUTE_CONFIG.filter(
    (config) =>
      config.type === "api" &&
      config.method !== undefined &&
      (config.path.startsWith(`/api/admin/${resourceName}/`) || config.path === `/api/admin/${resourceName}`)
  )
}

/**
 * Get API route path cho một resource và method
 */
export function getResourceApiRoute(
  resourceName: string,
  method: HttpMethod,
  action?: "detail" | "create" | "update" | "delete" | "restore" | "hard-delete" | "bulk" | "approve" | "unapprove" | "assign" | "search" | "send" | "list"
): string | undefined {
  const routes = getResourceAdminApiRoutes(resourceName)

  if (action === "detail") {
    const route = routes.find((r) => r.method === method && r.path.includes("/[id]") && !r.path.includes("/restore") && !r.path.includes("/hard-delete") && !r.path.includes("/approve") && !r.path.includes("/unapprove") && !r.path.includes("/assign") && r.path.endsWith("/[id]"))
    return route ? stripApiBase(route.path) : undefined // Remove /api prefix vì apiClient đã có baseURL
  }

  if (action === "create" || action === "send") {
    const route = routes.find((r) => r.method === "POST" && r.path === `/api/admin/${resourceName}`)
    return route ? stripApiBase(route.path) : undefined
  }

  if (action === "list") {
    const route = routes.find((r) => r.method === "GET" && r.path === `/api/admin/${resourceName}`)
    return route ? stripApiBase(route.path) : undefined
  }

  if (action === "update") {
    const route = routes.find((r) => r.method === "PUT" && r.path.includes("/[id]") && !r.path.includes("/restore") && !r.path.includes("/hard-delete") && !r.path.includes("/approve") && !r.path.includes("/unapprove") && !r.path.includes("/assign") && r.path.endsWith("/[id]"))
    return route ? stripApiBase(route.path) : undefined
  }

  if (action === "delete") {
    const route = routes.find((r) => r.method === "DELETE" && r.path.includes("/[id]") && !r.path.includes("/hard-delete") && r.path.endsWith("/[id]"))
    return route ? stripApiBase(route.path) : undefined
  }

  if (action === "restore") {
    const route = routes.find((r) => r.method === "POST" && r.path.includes("/[id]/restore"))
    return route ? stripApiBase(route.path) : undefined
  }

  if (action === "hard-delete") {
    const route = routes.find((r) => r.method === "DELETE" && r.path.includes("/[id]/hard-delete"))
    return route ? stripApiBase(route.path) : undefined
  }

  if (action === "bulk") {
    const route = routes.find((r) => r.method === "POST" && r.path.includes("/bulk"))
    return route ? stripApiBase(route.path) : undefined
  }

  if (action === "approve") {
    const route = routes.find((r) => r.method === "POST" && r.path.includes("/[id]/approve"))
    return route ? stripApiBase(route.path) : undefined
  }

  if (action === "unapprove") {
    const route = routes.find((r) => r.method === "POST" && r.path.includes("/[id]/unapprove"))
    return route ? stripApiBase(route.path) : undefined
  }

  if (action === "assign") {
    const route = routes.find((r) => r.method === "POST" && r.path.includes("/[id]/assign"))
    return route ? stripApiBase(route.path) : undefined
  }

  if (action === "search") {
    const route = routes.find((r) => r.method === "GET" && r.path.includes("/search"))
    return route ? stripApiBase(route.path) : undefined
  }

  // Default: find by method
  const route = routes.find((r) => r.method === method)
  return route ? stripApiBase(route.path) : undefined
}

/**
 * Generate standard API routes object cho một resource
 */
export function generateResourceApiRoutes(resourceName: string) {
  const basePath = `/admin/${resourceName}`
  
  // Get routes từ ROUTE_CONFIG
  const rawListRoute = getResourceApiRoute(resourceName, "GET")
  const listRoute =
    rawListRoute && rawListRoute.includes("/options") ? undefined : rawListRoute
  const createRoute = getResourceApiRoute(resourceName, "POST", "create")
  const detailRoute = getResourceApiRoute(resourceName, "GET", "detail")
  const updateRoute = getResourceApiRoute(resourceName, "PUT", "update")
  const deleteRoute = getResourceApiRoute(resourceName, "DELETE", "delete")
  const restoreRoute = getResourceApiRoute(resourceName, "POST", "restore")
  const hardDeleteRoute = getResourceApiRoute(resourceName, "DELETE", "hard-delete")
  const bulkRoute = getResourceApiRoute(resourceName, "POST", "bulk")
  
  // Options route luôn có pattern /admin/{name}/options
  const optionsRoute = `${basePath}/options`

  return {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
      const route = listRoute || basePath
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      if (params?.status) searchParams.set("status", params.status)
      const queryString = searchParams.toString()
      return `${route}${queryString ? `?${queryString}` : ""}`
    },
    detail: (id: string) => {
      const route = detailRoute || `${basePath}/[id]`
      return route.replace("[id]", id)
    },
    create: createRoute || basePath,
    update: (id: string) => {
      const route = updateRoute || `${basePath}/[id]`
      return route.replace("[id]", id)
    },
    delete: (id: string) => {
      const route = deleteRoute || `${basePath}/[id]`
      return route.replace("[id]", id)
    },
    restore: (id: string) => {
      const route = restoreRoute || `${basePath}/[id]/restore`
      return route.replace("[id]", id)
    },
    hardDelete: (id: string) => {
      const route = hardDeleteRoute || `${basePath}/[id]/hard-delete`
      return route.replace("[id]", id)
    },
    bulk: bulkRoute || `${basePath}/bulk`,
    options: (params?: { column: string; search?: string; limit?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.column) searchParams.set("column", params.column)
      if (params?.search) searchParams.set("search", params.search)
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      const queryString = searchParams.toString()
      return `${optionsRoute}${queryString ? `?${queryString}` : ""}`
    },
  }
}
