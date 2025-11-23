/**
 * Resource Logger - Logger chuẩn cho data table và data detail
 * 
 * Cung cấp logging chuẩn để theo dõi:
 * - Cấu trúc dữ liệu đầy đủ của table (columns, rows, pagination)
 * - Cấu trúc dữ liệu đầy đủ của record detail (tất cả fields)
 * - Các action đang được sử dụng
 * - Working flow chi tiết
 * - Action tracking cho data table và data detail
 */

import { logger } from "./logger"

/**
 * Action types cho resource operations
 */
export type ResourceAction =
  | "load-table"
  | "load-detail"
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "hard-delete"
  | "toggle-status"
  | "bulk-delete"
  | "bulk-restore"
  | "bulk-hard-delete"
  | "bulk-approve"
  | "bulk-unapprove"
  | "cache-invalidate"
  | "cache-refresh"
  | "socket-update"
  | "error"
  | "publish"
  | "unpublish"
  | "approve"
  | "unapprove"
  | "query"

/**
 * Resource context cho logging
 */
export interface ResourceLogContext {
  resource: string
  action: ResourceAction
  resourceId?: string
  [key: string]: unknown
}

/**
 * Data structure logging - Log đầy đủ cấu trúc dữ liệu
 */
export interface DataStructureLog {
  resource: string
  dataType: "table" | "detail" | "form"
  structure: {
    // Cho table: columns, rows, pagination, sampleRows
    columns?: string[]
    rows?: Array<Record<string, unknown>> // Backward compatibility
    sampleRows?: Array<Record<string, unknown>> // Hiển thị đầy đủ rows hiện tại
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    // Cho detail: tất cả fields của record
    fields?: Record<string, unknown>
    // Cho table status sau mutation
    tableStatus?: {
      activeCount: number
      deletedCount: number
      affectedCount?: number
      affectedIds?: string[]
      summary?: string
    }
    [key: string]: unknown
  }
  rowCount?: number
}

/**
 * Action flow logging
 */
export interface ActionFlowLog {
  resource: string
  action: ResourceAction
  step: "init" | "start" | "success" | "error" | "end"
  duration?: number
  metadata?: Record<string, unknown>
}

/**
 * Resource Logger instance
 */
export const resourceLogger = {
  /**
   * Log action cho data table
   */
  tableAction: (context: ResourceLogContext & { view?: string; page?: number; total?: number }) => {
    logger.debug(`[${context.resource.toUpperCase()}] Table Action: ${context.action}`, {
      action: context.action,
      resource: context.resource,
      view: context.view,
      page: context.page,
      total: context.total,
      resourceId: context.resourceId,
      ...Object.fromEntries(
        Object.entries(context).filter(([key]) => !["resource", "action", "resourceId", "view", "page", "total"].includes(key))
      ),
    })
  },

  /**
   * Log action cho data detail - Log đầy đủ thông tin record detail
   */
  detailAction: (context: ResourceLogContext & { 
    resourceId: string
    recordData?: Record<string, unknown>
    fields?: string[]
  }) => {
    const { resource, action, resourceId, recordData, fields, ...rest } = context
    const allFields = fields || (recordData ? Object.keys(recordData) : [])
    logger.debug(`[${resource.toUpperCase()}] 📄 Detail Action: ${action}`, {
      action,
      resource,
      resourceId,
      fields: allFields,
      fieldCount: allFields.length,
      // Log đầy đủ recordData để theo dõi cấu trúc dữ liệu
      recordData: recordData || undefined,
      ...rest,
    })
  },

  /**
   * Log data structure - Log đầy đủ cấu trúc dữ liệu table hoặc detail
   */
  dataStructure: (log: DataStructureLog) => {
    const { resource, dataType, structure, rowCount } = log
    
    if (dataType === "table") {
      // Ưu tiên sampleRows nếu có, nếu không thì dùng rows (backward compatibility)
      const rowsToLog = structure.sampleRows || structure.rows || []
      logger.debug(`[${resource.toUpperCase()}] 📊 Table Structure`, {
        resource,
        dataType,
        columns: structure.columns || [],
        rowCount: rowCount ?? rowsToLog.length,
        pagination: structure.pagination,
        sampleRows: rowsToLog, // Hiển thị đầy đủ rows hiện tại
        totalRows: rowsToLog.length,
        tableStatus: structure.tableStatus,
      })
    } else if (dataType === "detail") {
      logger.debug(`[${resource.toUpperCase()}] 📄 Detail Structure`, {
        resource,
        dataType,
        fields: Object.keys(structure.fields || {}),
        fieldCount: Object.keys(structure.fields || {}).length,
        data: structure.fields,
      })
    } else {
      logger.debug(`[${resource.toUpperCase()}] 📋 ${dataType} Structure`, {
        resource,
        dataType,
        structure,
        rowCount,
      })
    }
  },

  /**
   * Log action flow
   */
  actionFlow: (log: ActionFlowLog) => {
    const emoji = {
      start: "▶️",
      success: "✅",
      error: "❌",
      init: "🔄",
      end: "🏁",
    }[log.step]

    logger.debug(`${emoji} [${log.resource.toUpperCase()}] Action Flow: ${log.action} - ${log.step}`, {
      resource: log.resource,
      action: log.action,
      step: log.step,
      duration: log.duration,
      ...log.metadata,
    })
  },

  /**
   * Log cache operations
   */
  cache: (context: ResourceLogContext & { operation: "invalidate" | "refresh" | "update" | "invalidate-bulk" | "read"; tags?: string[] }) => {
    logger.debug(`[${context.resource.toUpperCase()}] Cache ${context.operation}`, {
      resource: context.resource,
      operation: context.operation,
      resourceId: context.resourceId,
      tags: context.tags,
      ...Object.fromEntries(
        Object.entries(context).filter(([key]) => !["resource", "operation", "resourceId", "tags"].includes(key))
      ),
    })
  },

  /**
   * Log socket operations
   */
  socket: (context: ResourceLogContext & { event: string; payload?: unknown }) => {
    logger.debug(`[${context.resource.toUpperCase()}] Socket: ${context.event}`, {
      resource: context.resource,
      event: context.event,
      action: context.action,
      resourceId: context.resourceId,
      payload: context.payload,
      ...Object.fromEntries(
        Object.entries(context).filter(([key]) => !["resource", "event", "action", "resourceId", "payload"].includes(key))
      ),
    })
  },
}

