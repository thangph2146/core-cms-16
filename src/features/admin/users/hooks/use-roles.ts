"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api/axios"
import type { Role } from "../utils"

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchRoles() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await apiClient.get<{ data: Role[] }>("/roles")
        setRoles(response.data.data)
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to fetch roles")
        console.error("Error fetching roles:", error)
        setError(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchRoles()
  }, [])

  return { roles, isLoading, error }
}

