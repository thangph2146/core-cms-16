import type { NextApiRequest, NextApiResponse } from "next"
import type { Server as HTTPServer } from "http"
import { Server as IOServer, Socket } from "socket.io"
import { NotificationKind, type Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import {
  getNotificationCache,
  mapNotificationToPayload,
  storeNotificationInCache,
  setSocketServer,
  MAX_IN_MEMORY_NOTIFICATIONS,
  type SocketNotificationPayload as NotificationPayload,
  type SocketNotificationKind as NotificationKindClient,
} from "@/lib/socket/state"

// Helper to create a stable room id for a 1-1 conversation
function conversationRoom(a: string, b: string) {
  const [x, y] = [a, b].sort()
  return `conversation:${x}:${y}`
}

const userRoom = (userId: string) => `user:${userId}`
const roleRoom = (role: string) => `role:${role}`

function randomNotificationId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function toJsonValue(
  value: Record<string, unknown> | null | undefined,
): JsonValue | null | undefined {
  if (value == null) {
    return value
  }
  return value as JsonValue
}

const notificationCache = getNotificationCache()
type JsonValue = Prisma.InputJsonValue
type JsonObject = Prisma.InputJsonObject

function normalizeKind(kind?: string | NotificationKind | null): NotificationKind {
  if (!kind) return NotificationKind.MESSAGE
  const normalized = String(kind).toUpperCase() as NotificationKind
  if ((Object.values(NotificationKind) as string[]).includes(normalized)) {
    return normalized
  }
  return NotificationKind.MESSAGE
}

function mapKindToClient(kind: NotificationKind): NotificationKindClient {
  return kind.toLowerCase() as NotificationKindClient
}


async function persistNotificationForUser({
  userId,
  title,
  description,
  actionUrl,
  kind,
  metadata,
}: {
  userId: string
  title: string
  description?: string
  actionUrl?: string
  kind?: string | NotificationKind
  metadata?: JsonValue | null
}) {
  const created = await prisma.notification.create({
    data: {
      userId,
      title,
      description,
      actionUrl,
      kind: normalizeKind(kind),
      metadata: metadata ?? undefined,
    },
  })

  return created
}

async function createNotificationsForRole(
  roleName: string,
  notification: {
    title: string
    description?: string
    actionUrl?: string
    kind?: string | NotificationKind
    metadata?: JsonValue | null
  },
) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      userRoles: {
        some: {
          role: {
            name: roleName,
          },
        },
      },
    },
    select: { id: true },
  })

  if (users.length === 0) {
    return 0
  }

  const normalizedKind = normalizeKind(notification.kind)
  const payloads = users.map((user) => ({
    userId: user.id,
    title: notification.title,
    description: notification.description,
    actionUrl: notification.actionUrl,
    kind: normalizedKind,
    metadata: notification.metadata ?? undefined,
  }))

  await prisma.notification.createMany({ data: payloads })

  users.forEach((user) => {
    storeNotificationInCache(user.id, {
      id: randomNotificationId("role"),
      kind: mapKindToClient(normalizedKind),
      title: notification.title,
      description: notification.description,
      toUserId: user.id,
      timestamp: Date.now(),
      read: false,
      actionUrl: notification.actionUrl,
    })
  })

  return users.length
}

async function ensureUserNotificationsCached(userId: string) {
  if (notificationCache.has(userId)) {
    logger.debug("Cache hit for user notifications", { userId })
    return
  }

  logger.debug("Loading notifications from database", { userId })
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      take: MAX_IN_MEMORY_NOTIFICATIONS,
    })

    if (notifications.length > 0) {
      notificationCache.set(
        userId,
        notifications.map(mapNotificationToPayload),
      )
      logger.success("Loaded notifications into cache", {
        userId,
        count: notifications.length,
      })
    } else {
      notificationCache.set(userId, [])
      logger.debug("No notifications found for user", { userId })
    }
  } catch (error) {
    logger.error("Failed to load notifications for user", error instanceof Error ? error : new Error(String(error)))
    notificationCache.set(userId, [])
  }
}

async function setupSocketHandlers(io: IOServer) {
  logger.info("Setting up Socket.IO handlers", {
    action: "initialize_handlers",
  })
  
  io.on("connection", async (socket: Socket) => {
    const auth = socket.handshake.auth as { userId?: string; role?: string }
    const userId = auth?.userId
    const role = auth?.role
    const socketId = socket.id

    logger.success("New client connected", {
      socketId,
      userId: userId || "anonymous",
      role: role ?? null,
      transport: socket.conn.transport.name,
      remoteAddress: socket.handshake.address,
    })

    if (userId) {
      const userRoomName = userRoom(userId)
      socket.join(userRoomName)
      logger.info("Socket joined user room", { socketId, userId, room: userRoomName })

      await ensureUserNotificationsCached(userId)
      const userNotifications = notificationCache.get(userId) ?? []
      if (userNotifications.length > 0) {
        socket.emit("notifications:sync", userNotifications)
        logger.debug("Synced notifications to user", {
          socketId,
          userId,
          count: userNotifications.length,
        })
      } else {
        logger.debug("No notifications to sync for user", { socketId, userId })
      }
    } else {
      logger.warn("Client connected without userId", { socketId })
    }

    if (role) {
      const roleRoomName = roleRoom(role)
      socket.join(roleRoomName)
      logger.info("Socket joined role room", { socketId, role, room: roleRoomName })
    }

    socket.on("join-conversation", ({ a, b }: { a: string; b: string }) => {
      const room = conversationRoom(a, b)
      socket.join(room)
      logger.info("Socket joined conversation room", {
        socketId,
        userId,
        room,
        participants: [a, b],
      })
    })

    socket.on("leave-conversation", ({ a, b }: { a: string; b: string }) => {
      const room = conversationRoom(a, b)
      socket.leave(room)
      logger.info("Socket left conversation room", {
        socketId,
        userId,
        room,
        participants: [a, b],
      })
    })

    socket.on(
      "message:send",
      async ({
        parentMessageId,
        content,
        fromUserId,
        toUserId,
      }: {
        parentMessageId?: string
        content: string
        fromUserId: string
        toUserId: string
      }) => {
        const room = conversationRoom(fromUserId, toUserId)

        logger.info("Received message", {
          socketId,
          fromUserId,
          toUserId,
          room,
          contentLength: content.length,
          hasParent: !!parentMessageId,
        })

        const payload = {
          parentMessageId,
          content,
          fromUserId,
          toUserId,
          timestamp: Date.now(),
        }

        io.to(room).emit("message:new", payload)
        logger.success("Message broadcasted to conversation room", {
          room,
          fromUserId,
          toUserId,
        })

        const getActionUrl = (recipientId: string, messageId: string, senderId: string) => {
          const isFromAdmin =
            senderId.includes("admin") || senderId.startsWith("cmh8leuua")

          if (isFromAdmin) {
            return `/parents/messages/${messageId}`
          }
          return `/admin/messages/${messageId}`
        }

        let persistedId: string | null = null
        let persistedPayload: NotificationPayload | null = null
        let actionUrl = getActionUrl(toUserId, parentMessageId ?? "", fromUserId)
        const messageMetadata: JsonObject = parentMessageId
          ? { fromUserId, parentMessageId }
          : { fromUserId }

        try {
          const created = await persistNotificationForUser({
            userId: toUserId,
            title: "Bạn có tin nhắn mới",
            description: content.length > 50 ? `${content.substring(0, 50)}...` : content,
            actionUrl,
            kind: NotificationKind.MESSAGE,
            metadata: messageMetadata,
          })
          persistedId = created.id
          persistedPayload = mapNotificationToPayload(created)
          actionUrl = persistedPayload.actionUrl ?? actionUrl
          logger.debug("Notification persisted to database", {
            notificationId: persistedId,
            toUserId,
          })
        } catch (error) {
          logger.error("Failed to persist notification", error instanceof Error ? error : new Error(String(error)))
        }

        const notification: NotificationPayload =
          persistedPayload ?? {
            id:
              persistedId ??
              randomNotificationId("msg"),
            kind: "message",
            title: "Bạn có tin nhắn mới",
            description:
              content.length > 50 ? content.substring(0, 50) + "..." : content,
            fromUserId,
            toUserId,
            parentMessageId,
            timestamp: Date.now(),
            read: false,
            actionUrl,
          }

        storeNotificationInCache(toUserId, notification)

        io.to(userRoom(toUserId)).emit("notification:new", notification)
        logger.success("Notification sent to user room", {
          notificationId: notification.id,
          toUserId,
          room: userRoom(toUserId),
        })

        io.to(roleRoom("ADMIN")).emit("notification:admin", {
          ...notification,
          title: "Tin nhắn mới từ phụ huynh",
          description: `Phụ huynh đã gửi tin nhắn: ${notification.description}`,
        })
        logger.debug("Admin notification sent", {
          room: roleRoom("ADMIN"),
        })
      },
    )

    socket.on(
      "notification:read",
      ({ notificationId }: { notificationId: string }) => {
        if (!userId) {
          logger.warn("notification:read called without userId", { socketId })
          return
        }

        const userNotifications = notificationCache.get(userId) || []
        const notification = userNotifications.find((n) => n.id === notificationId)
        if (!notification) {
          logger.warn("Notification not found", { socketId, userId, notificationId })
          return
        }

        notification.read = true
        io.to(userRoom(userId)).emit("notification:updated", notification)
        logger.debug("Notification marked as read", {
          socketId,
          userId,
          notificationId,
        })
      },
    )

    socket.on("notifications:mark-all-read", () => {
      if (!userId) {
        logger.warn("notifications:mark-all-read called without userId", { socketId })
        return
      }

      const userNotifications = notificationCache.get(userId) || []
      const count = userNotifications.length
      userNotifications.forEach((n) => (n.read = true))
      io.to(userRoom(userId)).emit("notifications:sync", userNotifications)
      logger.info("All notifications marked as read", {
        socketId,
        userId,
        count,
      })
    })

    socket.on(
      "system:notify",
      async ({
        targetUserId,
        targetRole,
        notification,
      }: {
        targetUserId?: string
        targetRole?: string
        notification: Omit<NotificationPayload, "id" | "timestamp" | "read">
      }) => {
        logger.info("System notification requested", {
          socketId,
          targetUserId,
          targetRole,
          notificationTitle: notification.title,
        })

        const systemNotification: NotificationPayload = {
          ...notification,
          id: randomNotificationId("sys"),
          timestamp: Date.now(),
          read: false,
        }

        if (targetUserId) {
          storeNotificationInCache(targetUserId, systemNotification)
          io.to(userRoom(targetUserId)).emit("notification:new", systemNotification)
          logger.success("System notification sent to user", {
            notificationId: systemNotification.id,
            targetUserId,
          })

          try {
            await persistNotificationForUser({
              userId: targetUserId,
              title: systemNotification.title,
              description: systemNotification.description ?? undefined,
              actionUrl: systemNotification.actionUrl ?? undefined,
              kind: systemNotification.kind,
              metadata: toJsonValue(systemNotification.metadata) ?? undefined,
            })
            logger.debug("System notification persisted to database", {
              notificationId: systemNotification.id,
              targetUserId,
            })
          } catch (error) {
            logger.error("Failed to persist system notification", error instanceof Error ? error : new Error(String(error)))
          }
        }

        if (targetRole) {
          io.to(roleRoom(targetRole)).emit("notification:new", systemNotification)
          logger.success("System notification sent to role room", {
            notificationId: systemNotification.id,
            targetRole,
            room: roleRoom(targetRole),
          })

          try {
            const count = await createNotificationsForRole(targetRole, {
              title: systemNotification.title,
              description: systemNotification.description ?? undefined,
              actionUrl: systemNotification.actionUrl ?? undefined,
              kind: systemNotification.kind,
              metadata: toJsonValue(systemNotification.metadata),
            })
            logger.debug("System notifications persisted for role", {
              notificationId: systemNotification.id,
              targetRole,
              userCount: count,
            })
          } catch (error) {
            logger.error("Failed to persist notifications for role", error instanceof Error ? error : new Error(String(error)))
          }
        }
      },
    )

    socket.on("disconnect", (reason) => {
      logger.info("Client disconnected", {
        socketId,
        userId,
        reason,
      })
    })
  })
}

type ServerWithIO = HTTPServer & { io?: IOServer }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
    logger.info("Socket API handler called", {
      method: req.method,
      url: req.url,
    })

    const server = (res.socket as unknown as { server: ServerWithIO } | undefined)?.server

    if (!server) {
      logger.error("Server not available", new Error("HTTP server not found"))
      res.status(500).end("Socket server not available")
      return
    }

    if (!server.io) {
      logger.info("Initializing Socket.IO server", {
        path: "/api/socket",
        cors: true,
      })

      const io = new IOServer(server, {
        path: "/api/socket",
        cors: { origin: true, credentials: true },
      })
      await setupSocketHandlers(io)
      server.io = io

      setSocketServer(io)
      
      logger.success("Socket.IO server initialized successfully", {
        path: "/api/socket",
        status: "ready",
        message: "Đang chờ kết nối từ clients...",
      })
    } else {
      logger.info("Socket.IO server already initialized", {
        path: "/api/socket",
        status: "already_initialized",
      })
    }

    res.end()
  } catch (error) {
    logger.error("Socket API error", error instanceof Error ? error : new Error(String(error)))
    res.status(500).end("Internal Server Error")
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
