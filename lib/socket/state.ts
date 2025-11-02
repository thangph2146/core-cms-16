import type { Notification } from "@prisma/client"
import type { Server as IOServer } from "socket.io"

export const MAX_IN_MEMORY_NOTIFICATIONS = 50

export type SocketNotificationKind =
  | "message"
  | "system"
  | "announcement"
  | "alert"
  | "warning"
  | "success"
  | "info"

export interface SocketNotificationPayload {
  id: string
  kind: SocketNotificationKind
  title: string
  description?: string | null
  fromUserId?: string
  toUserId?: string
  parentMessageId?: string
  timestamp: number
  read?: boolean
  actionUrl?: string | null
  metadata?: Record<string, unknown> | null
}

type GlobalSocketState = typeof globalThis & {
  ioServer?: IOServer
  notificationCache?: Map<string, SocketNotificationPayload[]>
}

const globalState = globalThis as GlobalSocketState

export function getSocketServer(): IOServer | undefined {
  return globalState.ioServer
}

export function setSocketServer(io: IOServer) {
  globalState.ioServer = io
}

export function getNotificationCache(): Map<string, SocketNotificationPayload[]> {
  if (!globalState.notificationCache) {
    globalState.notificationCache = new Map()
  }
  return globalState.notificationCache
}

export function extractNotificationMetadata(
  metadata: Notification["metadata"],
): Record<string, unknown> | null {
  if (!metadata) return null
  if (typeof metadata === "object") return metadata as Record<string, unknown>
  try {
    return JSON.parse(String(metadata)) as Record<string, unknown>
  } catch {
    return { value: metadata }
  }
}

export function mapNotificationToPayload(
  notification: Notification,
): SocketNotificationPayload {
  const metadata = extractNotificationMetadata(notification.metadata)
  return {
    id: notification.id,
    kind: notification.kind.toLowerCase() as SocketNotificationKind,
    title: notification.title,
    description: notification.description,
    fromUserId: typeof metadata?.fromUserId === "string" ? metadata.fromUserId : undefined,
    toUserId: notification.userId,
    parentMessageId:
      typeof metadata?.parentMessageId === "string" ? metadata.parentMessageId : undefined,
    timestamp: notification.createdAt.getTime(),
    read: notification.isRead,
    actionUrl: notification.actionUrl,
    metadata,
  }
}

export function storeNotificationInCache(
  userId: string,
  notification: SocketNotificationPayload,
) {
  const cache = getNotificationCache()
  const items = cache.get(userId) ?? []
  items.unshift(notification)
  if (items.length > MAX_IN_MEMORY_NOTIFICATIONS) {
    items.splice(MAX_IN_MEMORY_NOTIFICATIONS)
  }
  cache.set(userId, items)
}

export function updateNotificationInCache(
  userId: string,
  notificationId: string,
  updater: (notification: SocketNotificationPayload) => void,
): SocketNotificationPayload | undefined {
  const cache = getNotificationCache()
  const items = cache.get(userId)
  if (!items) return undefined
  const target = items.find((item) => item.id === notificationId)
  if (!target) return undefined
  updater(target)
  return target
}

export function removeNotificationFromCache(
  userId: string,
  notificationId: string,
): boolean {
  const cache = getNotificationCache()
  const items = cache.get(userId)
  if (!items) return false
  const index = items.findIndex((item) => item.id === notificationId)
  if (index === -1) return false
  items.splice(index, 1)
  return true
}
