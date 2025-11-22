"use client"

import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "@/hooks/use-socket"
import { resourceLogger } from "@/lib/config"
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

interface StudentBatchUpsertPayload {
  students: Array<{
    student: StudentRow
    previousStatus: "active" | "deleted" | null
    newStatus: "active" | "deleted"
  }>
}

/**
 * Update student queries với updater function
 */
function updateStudentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (args: { key: unknown[]; params: AdminStudentsListParams; data: DataTableResult<StudentRow> }) => DataTableResult<StudentRow> | null,
): boolean {
  let updated = false
  const queries = queryClient.getQueriesData<DataTableResult<StudentRow>>({
    queryKey: queryKeys.adminStudents.all() as unknown[],
  })
  
  for (const [key, data] of queries) {
    if (!Array.isArray(key) || key.length < 2) continue
    const params = key[1] as AdminStudentsListParams | undefined
    if (!params || !data) continue
    
    const next = updater({ key, params, data })
    if (next) {
      queryClient.setQueryData(key, next)
      updated = true
      resourceLogger.socket({
        resource: "students",
        action: "socket-update",
        event: "cache-update",
        payload: {
          queryKey: key.slice(0, 2),
          params: {
            status: params.status,
            page: params.page,
            limit: params.limit,
            search: params.search,
            filtersCount: Object.keys(params.filters ?? {}).length,
          },
          dataTable: {
            rowsCount: next.rows.length,
            total: next.total,
            totalPages: next.totalPages,
            page: next.page,
            limit: next.limit,
          },
        },
      })
    }
  }
  
  return updated
}

/**
 * Tính toán totalPages từ total và limit
 */
function calculateTotalPages(total: number, limit: number): number {
  return total === 0 ? 0 : Math.ceil(total / limit)
}

/**
 * Xử lý upsert một student vào query data
 */
function handleStudentUpsert(
  student: StudentRow,
  params: AdminStudentsListParams,
  data: DataTableResult<StudentRow>
): DataTableResult<StudentRow> | null {
  const rowStatus: "active" | "deleted" = student.deletedAt ? "deleted" : "active"
  const matches = matchesFilters(params.filters, student) && matchesSearch(params.search, student)
  const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
  const existingIndex = data.rows.findIndex((row) => row.id === student.id)
  const shouldInclude = matches && includesByStatus

  if (existingIndex === -1 && !shouldInclude) {
    return null
  }

  let total = data.total
  let rows = data.rows
  let action: "insert" | "update" | "remove" | null = null

  if (shouldInclude) {
    if (existingIndex >= 0) {
      rows = rows.map((row) => (row.id === student.id ? student : row))
      action = "update"
    } else if (params.page === 1) {
      rows = insertRowIntoPage(rows, student, data.limit)
      total = total + 1
      action = "insert"
    }
  } else if (existingIndex >= 0) {
    const result = removeRowFromPage(rows, student.id)
    rows = result.rows
    if (result.removed) {
      total = Math.max(0, total - 1)
      action = "remove"
    }
  } else {
    return null
  }

  resourceLogger.socket({
    resource: "students",
    action: "socket-update",
    event: "upsert-processed",
    payload: {
      action,
      studentId: student.id,
      studentCode: student.studentCode,
      rowStatus,
      matches,
      includesByStatus,
      params: {
        status: params.status,
        page: params.page,
        search: params.search,
      },
      dataTable: {
        beforeTotal: data.total,
        afterTotal: total,
        beforeRowsCount: data.rows.length,
        afterRowsCount: rows.length,
      },
    },
  })

  return {
    ...data,
    rows,
    total,
    totalPages: calculateTotalPages(total, data.limit),
  }
}

/**
 * Xử lý batch upsert nhiều students
 */
function handleBatchUpsert(
  students: StudentRow[],
  params: AdminStudentsListParams,
  data: DataTableResult<StudentRow>
): DataTableResult<StudentRow> | null {
  let total = data.total
  let rows = data.rows
  const actions = { inserted: 0, updated: 0, removed: 0 }

  for (const student of students) {
    const rowStatus: "active" | "deleted" = student.deletedAt ? "deleted" : "active"
    const matches = matchesFilters(params.filters, student) && matchesSearch(params.search, student)
    const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
    const existingIndex = rows.findIndex((row) => row.id === student.id)
    const shouldInclude = matches && includesByStatus

    if (shouldInclude) {
      if (existingIndex >= 0) {
        rows = rows.map((row) => (row.id === student.id ? student : row))
        actions.updated++
      } else if (params.page === 1) {
        rows = insertRowIntoPage(rows, student, data.limit)
        total = total + 1
        actions.inserted++
      }
    } else if (existingIndex >= 0) {
      const result = removeRowFromPage(rows, student.id)
      rows = result.rows
      if (result.removed) {
        total = Math.max(0, total - 1)
        actions.removed++
      }
    }
  }

  resourceLogger.socket({
    resource: "students",
    action: "socket-update",
    event: "batch-upsert-processed",
    payload: {
      action: "batch-upsert",
      studentsCount: students.length,
      actions,
      params: {
        status: params.status,
        page: params.page,
        search: params.search,
      },
      dataTable: {
        beforeTotal: data.total,
        afterTotal: total,
        beforeRowsCount: data.rows.length,
        afterRowsCount: rows.length,
      },
    },
  })

  return {
    ...data,
    rows,
    total,
    totalPages: calculateTotalPages(total, data.limit),
  }
}

/**
 * Debounce cache version update - tối ưu để tránh duplicate updates
 */
const CACHE_UPDATE_DEBOUNCE_MS = 150

export function useStudentsSocketBridge() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const primaryRole = useMemo(() => session?.roles?.[0]?.name ?? null, [session?.roles])
  const [cacheVersion, setCacheVersion] = useState(0)
  const cacheVersionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const setupKeyRef = useRef<string | null>(null)

  const { socket, on } = useSocket({
    userId: session?.user?.id,
    role: primaryRole,
  })

  const [isConnected, setIsConnected] = useState<boolean>(() => Boolean(socket?.connected))

  /**
   * Debounced cache version update - chỉ update một lần cho mỗi batch events
   */
  const updateCacheVersion = useCallback(() => {
    if (cacheVersionTimeoutRef.current) {
      clearTimeout(cacheVersionTimeoutRef.current)
    }
    
    cacheVersionTimeoutRef.current = setTimeout(() => {
      setCacheVersion((prev) => {
        const next = prev + 1
        resourceLogger.socket({
          resource: "students",
          action: "cache-refresh",
          event: "cache-version-updated",
          payload: { version: next },
        })
        return next
      })
      cacheVersionTimeoutRef.current = null
    }, CACHE_UPDATE_DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return

    // Tạo unique key để tránh duplicate setup trong React strict mode
    const currentSetupKey = `${session.user.id}-${primaryRole ?? "null"}`
    if (setupKeyRef.current === currentSetupKey) return
    
    setupKeyRef.current = currentSetupKey
    resourceLogger.socket({
      resource: "students",
      action: "socket-update",
      event: "setup-bridge",
      payload: { userId: session.user.id, role: primaryRole },
    })

    const detachUpsert = on<[StudentUpsertPayload]>("student:upsert", (payload) => {
      const { student, previousStatus, newStatus } = payload as StudentUpsertPayload
      resourceLogger.socket({
        resource: "students",
        action: "socket-update",
        event: "student:upsert",
        payload: {
          studentId: student.id,
          studentCode: student.studentCode,
          name: student.name,
          email: student.email,
          isActive: student.isActive,
          previousStatus,
          newStatus,
          deletedAt: student.deletedAt,
        },
      })

      const updated = updateStudentQueries(queryClient, ({ params, data }) => {
        return handleStudentUpsert(student, params, data)
      })

      // Update detail query
      queryClient.setQueryData<{ data: StudentRow } | undefined>(
        queryKeys.adminStudents.detail(student.id),
        (oldData) => {
          if (!oldData) return undefined
          // Thay thế hoàn toàn với dữ liệu từ server (server là source of truth)
      resourceLogger.socket({
        resource: "students",
        action: "socket-update",
        event: "update-detail-cache",
        payload: {
          studentId: student.id,
          oldData: oldData.data,
          newData: student,
        },
      })
          return { data: student }
        }
      )
      
      if (updated) {
        updateCacheVersion()
      }
    })

    const detachBatchUpsert = on<[StudentBatchUpsertPayload]>("student:batch-upsert", (payload) => {
      const { students } = payload as StudentBatchUpsertPayload
      resourceLogger.socket({
        resource: "students",
        action: "socket-update",
        event: "student:batch-upsert",
        payload: {
          count: students.length,
          studentIds: students.map((s) => s.student.id),
          studentCodes: students.map((s) => s.student.studentCode),
          statuses: students.map((s) => ({
            id: s.student.id,
            previousStatus: s.previousStatus,
            newStatus: s.newStatus,
          })),
        },
      })

      const updated = updateStudentQueries(queryClient, ({ params, data }) => {
        return handleBatchUpsert(
          students.map((s) => s.student),
          params,
          data
        )
      })

      if (updated) {
        updateCacheVersion()
      }
    })

    const detachRemove = on<[StudentRemovePayload]>("student:remove", (payload) => {
      const { id, previousStatus } = payload as StudentRemovePayload
      resourceLogger.socket({
        resource: "students",
        action: "socket-update",
        event: "student:remove",
        payload: {
          studentId: id,
          previousStatus,
        },
      })
      
      const updated = updateStudentQueries(queryClient, ({ data }) => {
        const result = removeRowFromPage(data.rows, id)
        if (!result.removed) {
          return null
        }
        
        const total = Math.max(0, data.total - 1)
        
        return {
          ...data,
          rows: result.rows,
          total,
          totalPages: calculateTotalPages(total, data.limit),
        }
      })

      // Invalidate detail query for the removed student
      queryClient.setQueryData(queryKeys.adminStudents.detail(id), undefined)
      
      if (updated) {
        updateCacheVersion()
      }
    })

    return () => {
      // Chỉ cleanup khi setup key thay đổi (userId hoặc role thay đổi)
      if (setupKeyRef.current === currentSetupKey) {
        setupKeyRef.current = null
        if (cacheVersionTimeoutRef.current) {
          clearTimeout(cacheVersionTimeoutRef.current)
          cacheVersionTimeoutRef.current = null
        }
        detachUpsert?.()
        detachBatchUpsert?.()
        detachRemove?.()
        resourceLogger.socket({
          resource: "students",
          action: "socket-update",
          event: "cleanup-bridge",
          payload: { userId: session.user.id, role: primaryRole },
        })
      }
    }
  }, [session?.user?.id, on, queryClient, primaryRole, updateCacheVersion])

  useEffect(() => {
    if (!socket) return

    const handleConnect = () => {
      setIsConnected(true)
      resourceLogger.socket({
        resource: "students",
        action: "socket-update",
        event: "socket-connected",
        payload: {},
      })
    }
    
    const handleDisconnect = () => {
      setIsConnected(false)
      resourceLogger.socket({
        resource: "students",
        action: "socket-update",
        event: "socket-disconnected",
        payload: {},
      })
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
    }
  }, [socket])

  return { socket, isSocketConnected: isConnected, cacheVersion }
}
