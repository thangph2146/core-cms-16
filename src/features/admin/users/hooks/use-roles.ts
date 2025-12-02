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
  // Sử dụng length trực tiếp thay vì useMemo để tránh React Compiler warning
  const initialRolesProvided = initialRoles.length > 0

  // Theo chuẩn Next.js 16: luôn fetch fresh data từ API
  const { data, isLoading, error } = useQuery(
    createAdminQueryOptions<{ data: Role[] }>({
      queryKey: queryKeys.roles.list(),
      queryFn: async () => {
        const response = await apiClient.get<{ data: Role[] }>(apiRoutes.roles.list())
        return response.data
      },
      enabled: enabled && !initialRolesProvided, // Chỉ fetch khi enabled và chưa có initialRoles
      initialData: initialRolesProvided ? { data: initialRoles } : undefined, // Sử dụng initialRoles nếu có
    })
  )

  // Ưu tiên: fetchedData > initialRoles
  const roles = useMemo(() => {
    if (data?.data) {
      return data.data
    }
    return initialRoles
  }, [data, initialRoles])

  return {
    roles,
    isLoading: isLoading && !initialRolesProvided, // Chỉ loading khi đang fetch và chưa có initialRoles
    error: error as Error | null,
  }
}

