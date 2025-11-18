"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "@/hooks/use-socket"
import { logger } from "@/lib/config"
import type { StudentRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import { queryKeys, type AdminStudentsListParams } from "@/lib/query-keys"
import {
  matchesSearch,
  matchesFilters,
  shouldIncludeInStatus,
  insertRowIntoPage,
  removeRowFromPage,
} from "../utils/socket-helpers"

interface StudentUpsertPayload {
  student: StudentRow
  previousStatus: "active" | "deleted" | null
  newStatus: "active" | "deleted"
}

interface StudentRemovePayload {
  id: string
  previousStatus: "active" | "deleted"
}

function updateStudentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (args: { key: unknown[]; params: AdminStudentsListParams; data: DataTableResult<StudentRow> }) => DataTableResult<StudentRow> | null,
): boolean {
  let updated = false
  const queries = queryClient.getQueriesData<DataTableResult<StudentRow>>({
    queryKey: queryKeys.adminStudents.all() as unknown[],
  })
  
  logger.debug("Found student queries to update", { count: queries.length })
  
  for (const [key, data] of queries) {
    if (!Array.isArray(key) || key.length < 2) continue
    const params = key[1] as AdminStudentsListParams | undefined
    if (!params || !data) {
      logger.debug("Skipping query", { hasParams: !!params, hasData: !!data })
      continue
    }
    const next = updater({ key, params, data })
    if (next) {
      logger.debug("Setting query data", {
        key: key.slice(0, 2),
        oldRowsCount: data.rows.length,
        newRowsCount: next.rows.length,
        oldTotal: data.total,
        newTotal: next.total,
      })
      queryClient.setQueryData(key, next)
      updated = true
    } else {
      logger.debug("Updater returned null, skipping update")
    }
  }
  
  return updated
}

export function useStudentsSocketBridge() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const primaryRole = useMemo(() => session?.roles?.[0]?.name ?? null, [session?.roles])
  const [cacheVersion, setCacheVersion] = useState(0)

  const { socket, on } = useSocket({
    userId: session?.user?.id,
    role: primaryRole,
  })

  const [isConnected, setIsConnected] = useState<boolean>(() => Boolean(socket?.connected))

  useEffect(() => {
    if (!session?.user?.id) return

    const detachUpsert = on<[StudentUpsertPayload]>("student:upsert", (payload) => {
      const { student, previousStatus, newStatus } = payload as StudentUpsertPayload
      const rowStatus: "active" | "deleted" = student.deletedAt ? "deleted" : "active"

      logger.debug("Received student:upsert", {
        studentId: student.id,
        previousStatus,
        newStatus,
        rowStatus,
        deletedAt: student.deletedAt,
      })

      const updated = updateStudentQueries(queryClient, ({ params, data }) => {
        const matches = matchesFilters(params.filters, student) && matchesSearch(params.search, student)
        const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
        const existingIndex = data.rows.findIndex((row) => row.id === student.id)
        const shouldInclude = matches && includesByStatus

        logger.debug("Processing student update", {
          studentId: student.id,
          viewStatus: params.status,
          rowStatus,
          includesByStatus,
          existingIndex,
          shouldInclude,
        })

        if (existingIndex === -1 && !shouldInclude) {
          return null
        }

        const next: DataTableResult<StudentRow> = { ...data }
        let total = next.total
        let rows = next.rows

        if (shouldInclude) {
          if (existingIndex >= 0) {
            // Thay thế hoàn toàn với dữ liệu từ server (server là source of truth)
            const updated = [...rows]
            updated[existingIndex] = student
            rows = updated
          } else if (params.page === 1) {
            rows = insertRowIntoPage(rows, student, next.limit)
            total = total + 1
          } else {
            // On pages > 1 we only adjust total if student previously existed
            if (previousStatus && previousStatus !== rowStatus) {
              // If moved to this status from different view and this page is not 1, we can't insert accurately
            }
          }
        } else if (existingIndex >= 0) {
          // Student đang ở trong list nhưng không match với view hiện tại (ví dụ: chuyển từ active sang deleted)
          logger.debug("Removing student from view", {
            studentId: student.id,
            viewStatus: params.status,
            rowStatus,
          })
          const result = removeRowFromPage(rows, student.id)
          rows = result.rows
          if (result.removed) {
            total = Math.max(0, total - 1)
          }
        } else {
          return null
        }

        const totalPages = total === 0 ? 0 : Math.ceil(total / next.limit)

        const result = {
          ...next,
          rows,
          total,
          totalPages,
        }

        logger.debug("Cache updated for student", {
          studentId: student.id,
          rowsCount: result.rows.length,
          total: result.total,
          wasRemoved: existingIndex >= 0 && !shouldInclude,
        })

        return result
      })
      
      if (updated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    const detachRemove = on<[StudentRemovePayload]>("student:remove", (payload) => {
      const { id } = payload as StudentRemovePayload
      logger.debug("Received student:remove", { studentId: id })
      
      const updated = updateStudentQueries(queryClient, ({ params, data }) => {
        const result = removeRowFromPage(data.rows, id)
        if (!result.removed) {
          logger.debug("Student not found in current view", { studentId: id, viewStatus: params.status })
          return null
        }
        
        const total = Math.max(0, data.total - 1)
        const totalPages = total === 0 ? 0 : Math.ceil(total / data.limit)
        
        logger.debug("Removed student from cache", {
          studentId: id,
          oldRowsCount: data.rows.length,
          newRowsCount: result.rows.length,
          oldTotal: data.total,
          newTotal: total,
        })
        
        return {
          ...data,
          rows: result.rows,
          total,
          totalPages,
        }
      })
      
      if (updated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    return () => {
      detachUpsert?.()
      detachRemove?.()
    }
  }, [session?.user?.id, on, queryClient])

  useEffect(() => {
    if (!socket) {
      return
    }

    const handleConnect = () => setIsConnected(true)
    const handleDisconnect = () => setIsConnected(false)

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
    }
  }, [socket])

  return { socket, isSocketConnected: isConnected, cacheVersion }
}

