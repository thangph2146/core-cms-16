/**
 * Non-cached Database Queries for Notifications
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */
import { validatePagination, buildPagination, type ResourcePagination } from "@/features/admin/resources/server"
import { Prisma, NotificationKind } from "@prisma/client"
import { prisma } from "@/lib/database"
import { logger } from "@/lib/config/logger"

export interface ListNotificationsInput {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string>
  userId?: string
  kind?: string
  isRead?: boolean
}

export interface ListedNotification {
  id: string
  userId: string
  user: {
    id: string
    email: string
    name: string | null
  }
  kind: string
  title: string
  description: string | null
  isRead: boolean
  actionUrl: string | null
  metadata: Prisma.JsonValue | null
  expiresAt: Date | null
  createdAt: Date
  readAt: Date | null
}

export interface ListNotificationsResult {
  data: ListedNotification[]
  pagination: ResourcePagination
}

function isValidKind(value: string): value is NotificationKind {
  return Object.values(NotificationKind).includes(value as NotificationKind)
}

function buildWhereClause(params: ListNotificationsInput): Prisma.NotificationWhereInput {
  const where: Prisma.NotificationWhereInput = {}

  // Chỉ hiển thị thông báo hệ thống (SYSTEM) và thông báo cá nhân (MESSAGE và các loại khác ngoài SYSTEM)
  // Luôn yêu cầu userId để chỉ hiển thị thông báo cá nhân của user đó
  // Thông báo hệ thống (SYSTEM) được hiển thị cho tất cả users
  
  // Nếu có filter kind cụ thể, sử dụng filter đó (để giữ tính năng filter theo kind)
  if (params.kind && isValidKind(params.kind)) {
    where.kind = params.kind
    // Nếu có userId và filter kind cụ thể, chỉ hiển thị notifications của user đó
    if (params.userId && params.kind !== NotificationKind.SYSTEM) {
      where.userId = params.userId
    }
  } else {
    // Nếu không có filter kind cụ thể, áp dụng logic chỉ hiển thị SYSTEM và thông báo cá nhân
    // Luôn yêu cầu userId để chỉ hiển thị thông báo cá nhân của user đó
    if (params.userId) {
      // Chỉ hiển thị: SYSTEM (tất cả) hoặc các loại khác ngoài SYSTEM mà user sở hữu
      where.OR = [
        { kind: NotificationKind.SYSTEM }, // Tất cả thông báo hệ thống
        {
          userId: params.userId,
          kind: { not: NotificationKind.SYSTEM }, // Thông báo cá nhân của user này
        },
      ]
    } else {
      // Nếu không có userId, chỉ hiển thị thông báo hệ thống
      // (Trường hợp này không nên xảy ra vì API route luôn truyền userId)
      where.kind = NotificationKind.SYSTEM
    }
  }

  if (params.isRead !== undefined) where.isRead = params.isRead

  if (params.search) {
    const searchValue = params.search.trim()
    if (searchValue.length > 0) {
      // Kết hợp search với existing OR clause
      const searchConditions: Prisma.NotificationWhereInput[] = [
        { title: { contains: searchValue, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: searchValue, mode: Prisma.QueryMode.insensitive } },
        { user: { email: { contains: searchValue, mode: Prisma.QueryMode.insensitive } } },
        { user: { name: { contains: searchValue, mode: Prisma.QueryMode.insensitive } } },
      ]
      
      // Nếu đã có OR clause (từ logic filter kind), kết hợp với AND
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ]
        delete where.OR
      } else {
        where.OR = searchConditions
      }
    }
  }

  if (params.filters) {
    for (const [key, rawValue] of Object.entries(params.filters)) {
      const value = rawValue?.trim()
      if (!value) continue

      switch (key) {
        case "userId":
          // Nếu đã có OR clause, cần kết hợp với AND
          if (where.OR && !params.kind) {
            // Đã xử lý trong OR clause ở trên, bỏ qua
            break
          }
          where.userId = value
          break
        case "userEmail":
          // Filter theo email của user thông qua relation
          // Nếu đã có OR clause, cần kết hợp với AND
          if (where.OR && !params.kind) {
            const existingAND = Array.isArray(where.AND) ? where.AND : []
            where.AND = [
              ...existingAND,
              { OR: where.OR },
              {
                user: {
                  email: {
                    equals: value,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            ]
            delete where.OR
          } else {
            where.user = {
              email: {
                equals: value,
                mode: Prisma.QueryMode.insensitive,
              },
            }
          }
          break
        case "kind":
          if (isValidKind(value)) {
            // Nếu đã có OR clause, thay thế bằng filter kind cụ thể
            if (where.OR && !params.kind) {
              delete where.OR
              where.kind = value as NotificationKind
            } else {
              where.kind = value as NotificationKind
            }
          }
          break
        case "isRead":
          where.isRead = value === "true"
          break
      }
    }
  }

  return where
}

/**
 * Non-cached query: List notifications
 * 
 * Sử dụng cho API routes hoặc khi cần fresh data
 */
export async function listNotifications(params: ListNotificationsInput = {}): Promise<ListNotificationsResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)

  logger.debug("Querying notifications from database", {
    params: {
      page,
      limit,
      search: params.search,
      filters: params.filters,
      userId: params.userId,
      kind: params.kind,
      isRead: params.isRead,
    },
    whereClause: JSON.stringify(where, null, 2),
  })

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.notification.count({ where }),
  ])

  // Log kết quả từ database
  logger.info("Notifications queried from database", {
    totalInDatabase: total,
    returnedCount: notifications.length,
    page,
    limit,
    notifications: notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      userEmail: n.user.email,
      kind: n.kind,
      title: n.title,
      isRead: n.isRead,
    })),
    kindDistribution: notifications.reduce((acc, n) => {
      acc[n.kind] = (acc[n.kind] || 0) + 1
      return acc
    }, {} as Record<string, number>),
  })

  return {
    data: notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      user: n.user,
      kind: n.kind,
      title: n.title,
      description: n.description,
      isRead: n.isRead,
      actionUrl: n.actionUrl,
      metadata: n.metadata,
      expiresAt: n.expiresAt,
      createdAt: n.createdAt,
      readAt: n.readAt,
    })),
    pagination: buildPagination(page, limit, total),
  }
}

/**
 * Non-cached query: Get notification by ID
 */
export async function getNotificationById(id: string): Promise<ListedNotification | null> {
  const notification = await prisma.notification.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })

  if (!notification) return null

  return {
    id: notification.id,
    userId: notification.userId,
    user: notification.user,
    kind: notification.kind,
    title: notification.title,
    description: notification.description,
    isRead: notification.isRead,
    actionUrl: notification.actionUrl,
    metadata: notification.metadata,
    expiresAt: notification.expiresAt,
    createdAt: notification.createdAt,
    readAt: notification.readAt,
  } as ListedNotification
}

/**
 * Get unique values for a specific column (for filter options)
 * For notifications, we only support userEmail (from user relation)
 */
export async function getNotificationColumnOptions(
  column: string,
  search?: string,
  limit: number = 50
): Promise<Array<{ label: string; value: string }>> {
  if (column !== "userEmail") {
    return []
  }

  const where: Prisma.UserWhereInput = {
    deletedAt: null, // Only active users
  }

  // Add search filter if provided
  if (search && search.trim()) {
    where.email = { contains: search.trim(), mode: "insensitive" }
  }

  // Get users that have notifications
  const usersWithNotifications = await prisma.user.findMany({
    where: {
      ...where,
      notifications: {
        some: {},
      },
    },
    select: {
      email: true,
    },
    distinct: ["email"],
    orderBy: { email: "asc" },
    take: limit,
  })

  // Map results to options format
  return usersWithNotifications
    .map((user) => {
      if (user.email && user.email.trim()) {
        return {
          label: user.email,
          value: user.email,
        }
      }
      return null
    })
    .filter((item): item is { label: string; value: string } => item !== null)
}

