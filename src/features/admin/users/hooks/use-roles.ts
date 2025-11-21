"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { logger } from "@/lib/config"
import type { Role } from "../utils"

export interface UseRolesOptions {
  /**
   * Danh sách roles được cung cấp sẵn (từ Server Component) để tránh fetch lại
   */
  initialRoles?: Role[]
  /**
   * Có cho phép fetch roles hay không (mặc định true)
   */
  enabled?: boolean
}

export function useRoles(options: UseRolesOptions = {}) {
  const { initialRoles = [], enabled = true } = options
  const initialRolesProvided = useMemo(() => initialRoles.length > 0, [initialRoles])

  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [isLoading, setIsLoading] = useState(enabled && !initialRolesProvided)
  const [error, setError] = useState<Error | null>(null)
  const hasFetchedRef = useRef(false)

  // Đồng bộ state khi initialRoles thay đổi
  useEffect(() => {
    if (initialRolesProvided) {
      setRoles(initialRoles)
      setIsLoading(false)
    }
  }, [initialRoles, initialRolesProvided])

  useEffect(() => {
    if (!enabled || initialRolesProvided || hasFetchedRef.current) {
      return
    }

    let isCancelled = false

    async function fetchRoles() {
      try {
        hasFetchedRef.current = true
        setIsLoading(true)
        setError(null)
        const response = await apiClient.get<{ data: Role[] }>(apiRoutes.roles.list())
        if (!isCancelled) {
          setRoles(response.data.data)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to fetch roles")
        logger.error("Error fetching roles", error as Error)
        if (!isCancelled) {
          setError(error)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchRoles()

    return () => {
      isCancelled = true
    }
  }, [enabled, initialRolesProvided])

  return { roles, isLoading, error }
}

