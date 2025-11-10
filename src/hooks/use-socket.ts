"use client"

import { useCallback, useEffect, useRef, type MutableRefObject } from "react"
import { io, type Socket } from "socket.io-client"
import { logger } from "@/lib/config"

export interface UseSocketOptions {
  userId?: string | null
  role?: string | null
}

export interface SocketMessagePayload {
  id?: string // Message ID từ database (nếu có)
  parentMessageId?: string
  content: string
  fromUserId: string
  toUserId?: string // Nullable for group messages
  groupId?: string // For group messages
  timestamp?: number
  isRead?: boolean // Include isRead status for message:updated events
  readers?: { // List of users who have read this message (for group messages)
    id: string
    name: string | null
    email: string
    avatar: string | null
  }[]
}

export interface SocketNotificationPayload {
  id: string
  kind: string
  title: string
  description?: string
  fromUserId?: string
  toUserId?: string
  parentMessageId?: string
  timestamp?: number
  read?: boolean
  actionUrl?: string
  metadata?: Record<string, unknown> | null
}

export interface SocketConversationPair {
  a: string
  b: string
}

export interface SocketContactRequestPayload {
  id: string
  name: string
  email: string
  phone?: string | null
  subject: string
  status: string
  priority: string
  createdAt: string
  assignedToId?: string | null
}

// Singleton socket instance to avoid duplicate connections in dev StrictMode
let clientSocket: Socket | null = null
let isConnecting = false
let bootstrapPromise: Promise<boolean> | null = null
let hasLoggedUnavailable = false
let lastConnectionErrorKey: string | null = null
let lastConnectionErrorAt = 0

type EventHandler = (...args: unknown[]) => void
const pendingHandlers = new Map<string, Set<EventHandler>>()

function queuePendingHandler<Args extends unknown[]>(
  event: string,
  handler: (...args: Args) => void,
) {
  if (!pendingHandlers.has(event)) {
    pendingHandlers.set(event, new Set())
  }
  pendingHandlers.get(event)!.add(handler as EventHandler)
}

function removePendingHandler<Args extends unknown[]>(
  event: string,
  handler: (...args: Args) => void,
) {
  const handlers = pendingHandlers.get(event)
  if (!handlers) return
  handlers.delete(handler as EventHandler)
  if (handlers.size === 0) {
    pendingHandlers.delete(event)
  }
}

function flushPendingHandlers(socket: Socket) {
  if (pendingHandlers.size === 0) return
  for (const [event, handlers] of pendingHandlers.entries()) {
    for (const handler of handlers) {
      socket.on(event, handler as Parameters<Socket["on"]>[1])
    }
  }
  pendingHandlers.clear()
}

function getActiveSocket(current: MutableRefObject<Socket | null>) {
  return current.current ?? clientSocket
}

function logConnectionIssue(error: Error) {
  const normalizedMessage = error.message?.toLowerCase?.() ?? ""
  const key = `${error.name}:${normalizedMessage}`
  const now = Date.now()

  if (lastConnectionErrorKey === key && now - lastConnectionErrorAt < 5000) {
    return
  }

  lastConnectionErrorKey = key
  lastConnectionErrorAt = now

  const context = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  }

  if (normalizedMessage.includes("timeout") || normalizedMessage.includes("xhr poll")) {
    logger.warn("Socket connection chậm, sẽ thử lại", context)
  } else {
    logger.error("Socket connection thất bại", error)
  }
}

async function ensureServerBootstrap(): Promise<boolean> {
  if (!bootstrapPromise) {
    logger.info("Bắt đầu bootstrap Socket.IO server")
    bootstrapPromise = (async () => {
      try {
        logger.debug("Đang gọi /api/socket để khởi tạo server")
        const { apiClient } = await import("@/lib/api/axios")
        const { apiRoutes } = await import("@/lib/api/routes")
        await apiClient.get(apiRoutes.socket)
        // Axios tự động throw error cho status >= 400
        // Nếu đến đây thì đã thành công

        logger.success("Server đã được khởi tạo thành công")
        return true
      } catch (error) {
        logger.error("Bootstrap error", error instanceof Error ? error : new Error(String(error)))
        bootstrapPromise = null
        return false
      }
    })()
  }

  return bootstrapPromise
}

export function useSocket({ userId, role }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const lastConversationRef = useRef<SocketConversationPair | null>(null)
  const connectAttemptRef = useRef<number>(0)

  useEffect(() => {
    logger.info("useSocket hook được gọi", { userId, role })
    
    if (!userId) {
      logger.debug("Không có userId, bỏ qua kết nối")
      return
    }

    // Check existing socket trước
    const existingSocket = getActiveSocket(socketRef)
    if (existingSocket && existingSocket.connected) {
      logger.info("Sử dụng socket connection hiện có", { socketId: existingSocket.id })
      socketRef.current = existingSocket
      return
    }

    // Nếu đang kết nối, không tạo connection mới
    if (isConnecting) {
      logger.debug("Đang kết nối, chờ...", { attempt: connectAttemptRef.current })
      return
    }
    
    // Prevent duplicate connections
    if (socketRef.current && !socketRef.current.disconnected) {
      logger.debug("Socket đã tồn tại và đang connected/disconnecting, bỏ qua")
      return
    }
    
    isConnecting = true
    connectAttemptRef.current += 1

    logger.info("Bắt đầu quá trình kết nối")
    
    ;(async () => {
      const endpointAvailable = await ensureServerBootstrap()

      if (!endpointAvailable) {
        if (!hasLoggedUnavailable) {
          logger.warn("Socket endpoint không khả dụng – bỏ qua kết nối client")
          hasLoggedUnavailable = true
        }
        isConnecting = false
        return
      }

      // Import apiRoutes để sử dụng socket path
      const { apiRoutes } = await import("@/lib/api/routes")
      const socketPath = `/api${apiRoutes.socket}`

      logger.info("Đang tạo socket connection", {
        userId,
        role,
        path: socketPath,
      })

      const host = typeof window !== "undefined" ? window.location.host : ""
      const isVercel = /\.vercel\.app$/i.test(host)
      
      // Sử dụng polling trước, sau đó upgrade lên websocket nếu có thể
      // Polling có độ tin cậy cao hơn, websocket nhanh hơn nhưng có thể bị block
      const selectedTransports = isVercel 
        ? (["polling"] as const) 
        : (["polling", "websocket"] as const) // Polling trước, websocket sau
      const disableUpgrade = false // Cho phép upgrade từ polling sang websocket

      const socket = io({
        path: socketPath,
        transports: selectedTransports as unknown as ("websocket" | "polling")[],
        upgrade: !disableUpgrade,
        withCredentials: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
        // Giảm timeout xuống 10s và cho phép fallback sang polling
        timeout: 10000,
        // Force polling nếu websocket fail
        forceNew: false,
        auth: {
          userId,
          role: role ?? undefined,
        },
      })

      socket.on("connect", () => {
        const engine = socket.io.engine
        logger.success("Đã kết nối thành công", { 
          socketId: socket.id, 
          transport: engine.transport.name,
          userId,
          role,
        })
        engine.once("upgrade", () => {
          logger.debug("Transport upgraded", { transport: engine.transport.name })
        })
        const conv = lastConversationRef.current
        if (conv) {
          socket.emit("join-conversation", conv)
        }
      })

      socket.on("connect_error", (err) => {
        const error = err instanceof Error ? err : new Error(String(err))
        logConnectionIssue(error)
        
        // Nếu websocket fail, Socket.IO sẽ tự động fallback sang polling
        // vì đã có ["polling", "websocket"] trong transports
        if (socket.io.engine?.transport?.name === "websocket") {
          logger.debug("WebSocket failed, Socket.IO will auto-fallback to polling")
        }
      })

      socket.on("disconnect", (reason) => {
        logger.info("Đã ngắt kết nối", { reason })
      })

      clientSocket = socket
      socketRef.current = socket
      flushPendingHandlers(socket)

      isConnecting = false
    })()

    return () => {
      // keep singleton alive; do not disconnect on unmount
    }
  }, [userId, role])

  const joinConversation = useCallback((a: string, b: string) => {
    const socket = getActiveSocket(socketRef)
    if (!socket) return
    const pair: SocketConversationPair = { a, b }
    lastConversationRef.current = pair
    socket.emit("join-conversation", pair)
  }, [])

  const leaveConversation = useCallback((a: string, b: string) => {
    const socket = getActiveSocket(socketRef)
    if (!socket) return
    const pair: SocketConversationPair = { a, b }
    socket.emit("leave-conversation", pair)
  }, [])

  const sendMessage = useCallback(
    ({ parentMessageId, content, fromUserId, toUserId }: SocketMessagePayload) => {
      const socket = getActiveSocket(socketRef)
      if (!socket) return
      socket.emit("message:send", {
        parentMessageId,
        content,
        fromUserId,
        toUserId,
      } satisfies SocketMessagePayload)
    },
    [],
  )

  const createSocketListener = useCallback(
    <Args extends unknown[]>(event: string, handler: (...args: Args) => void) => {
      const socket = getActiveSocket(socketRef)
      const attach = (target: Socket) =>
        target.on(event, handler as Parameters<Socket["on"]>[1])
      const detach = (target: Socket) =>
        target.off(event, handler as Parameters<Socket["off"]>[1])

      if (!socket) {
        queuePendingHandler(event, handler)
        return () => {
          const liveSocket = getActiveSocket(socketRef)
          if (!liveSocket) {
            removePendingHandler(event, handler)
            return
          }
          detach(liveSocket)
        }
      }

      attach(socket)

      return () => {
        const liveSocket = getActiveSocket(socketRef)
        if (liveSocket) {
          detach(liveSocket)
        } else {
          removePendingHandler(event, handler)
        }
      }
    },
    [],
  )

  const onMessageNew = useCallback(
    (handler: (payload: SocketMessagePayload) => void) =>
      createSocketListener("message:new", handler),
    [createSocketListener],
  )

  const onMessageUpdated = useCallback(
    (handler: (payload: SocketMessagePayload) => void) =>
      createSocketListener("message:updated", handler),
    [createSocketListener],
  )

  const onNotification = useCallback(
    (handler: (payload: SocketNotificationPayload) => void) => {
      const offNew = createSocketListener("notification:new", handler)
      const offAdmin = createSocketListener("notification:admin", handler)
      return () => {
        offNew?.()
        offAdmin?.()
      }
    },
    [createSocketListener],
  )

  const onNotificationsSync = useCallback(
    (handler: (payload: SocketNotificationPayload[]) => void) =>
      createSocketListener("notifications:sync", handler),
    [createSocketListener],
  )

  const onNotificationUpdated = useCallback(
    (handler: (payload: SocketNotificationPayload) => void) =>
      createSocketListener("notification:updated", handler),
    [createSocketListener],
  )

  const markNotificationAsRead = useCallback((notificationId: string) => {
    const socket = getActiveSocket(socketRef)
    if (!socket) return
    socket.emit("notification:read", { notificationId })
  }, [])

  const markAllNotificationsAsRead = useCallback(() => {
    const socket = getActiveSocket(socketRef)
    if (!socket) return
    socket.emit("notifications:mark-all-read")
  }, [])

  const onContactRequestCreated = useCallback(
    (handler: (payload: SocketContactRequestPayload) => void) =>
      createSocketListener("contact-request:new", handler),
    [createSocketListener],
  )

  const onContactRequestAssigned = useCallback(
    (handler: (payload: SocketContactRequestPayload) => void) =>
      createSocketListener("contact-request:assigned", handler),
    [createSocketListener],
  )

  return {
    socket: clientSocket,
    joinConversation,
    leaveConversation,
    sendMessage,
    onMessageNew,
    onMessageUpdated,
    onNotification,
    onNotificationsSync,
    onNotificationUpdated,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    onContactRequestCreated,
    onContactRequestAssigned,
  }
}
