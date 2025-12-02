"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { createAdminQueryOptions } from "@/features/admin/resources/config"
import type { Role } from "../utils"

export interface UseRolesOptions {
  initialRoles?: Role[]
  enabled?: boolean
}

export function useRoles(options: UseRolesOptions = {}) {
  const { initialRoles = [], enabled = true } = options
  const initialRolesProvided = initialRoles.length > 0

  const { data, isLoading, error } = useQuery(
    createAdminQueryOptions<{ data: Role[] }>({
      queryKey: queryKeys.roles.list(),
      queryFn: async () => {
        const response = await apiClient.get<{ data: Role[] }>(apiRoutes.roles.list())
        return response.data
      },
      enabled: enabled && !initialRolesProvided,
      initialData: initialRolesProvided ? { data: initialRoles } : undefined,
    })
  )
  const roles = useMemo(() => {
    if (data?.data) {
      return data.data
    }
    return initialRoles
  }, [data, initialRoles])

  return {
    roles,
    isLoading: isLoading && !initialRolesProvided,
    error: error as Error | null,
  }
}

