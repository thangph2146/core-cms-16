"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { logger } from "@/lib/config"
import { withApiBase } from "@/lib/config/api-paths"

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
  readers?: {
    // List of users who have read this message (for group messages)
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

type EventHandler = (...args: unknown[]) => void

interface SocketAuthOptions {
  userId: string
  role?: string | null
}

class SocketManager {
  private socket: Socket | null = null
  private connectPromise: Promise<Socket | null> | null = null
  private readonly pendingHandlers = new Map<string, Set<EventHandler>>()
  private bootstrapPromise: Promise<boolean> | null = null
  private hasLoggedUnavailable = false
  private lastConnectionErrorKey: string | null = null
  private lastConnectionErrorAt = 0
  private lastAuth: SocketAuthOptions | null = null
  private isDisconnecting = false

  getSocket(): Socket | null {
    return this.socket
  }

  withSocket(callback: (socket: Socket) => void): boolean {
    const active = this.socket
    if (!active || !active.connected) return false
    callback(active)
    return true
  }

  /**
   * Disconnect socket - chỉ gọi khi đăng xuất
   */
  disconnect(): void {
    this.isDisconnecting = true
    const active = this.socket
    if (active) {
      try {
        logger.info("Đang disconnect socket do đăng xuất")
        active.removeAllListeners()
        active.disconnect()
      } catch (error) {
        logger.warn(
          "Lỗi khi disconnect socket",
          error instanceof Error ? error : new Error(String(error)),
        )
      }
      this.socket = null
    }
    this.lastAuth = null
    this.connectPromise = null
    this.isDisconnecting = false
  }

  on<Args extends unknown[]>(event: string, handler: (...args: Args) => void): () => void {
    let handlers = this.pendingHandlers.get(event)
    if (!handlers) {
      handlers = new Set()
      this.pendingHandlers.set(event, handlers)
    }
    handlers.add(handler as EventHandler)

    const active = this.socket
    if (active) {
      active.on(event, handler as Parameters<Socket["on"]>[1])
    }

    return () => {
      const liveSocket = this.socket
      if (liveSocket) {
        liveSocket.off(event, handler as Parameters<Socket["off"]>[1])
      }

      const stored = this.pendingHandlers.get(event)
      if (!stored) return
      stored.delete(handler as EventHandler)
      if (stored.size === 0) {
        this.pendingHandlers.delete(event)
      }
    }
  }

  async connect(auth: SocketAuthOptions): Promise<Socket | null> {
    if (!auth.userId) return null

    // Nếu đang disconnect (đăng xuất), không connect lại
    if (this.isDisconnecting) {
      return null
    }

    // Nếu socket đã connected và cùng auth, giữ nguyên
    if (this.socket && this.socket.connected && this.isSameAuth(auth)) {
      return this.socket
    }

    // Nếu socket đã connected nhưng auth khác, chỉ cập nhật auth (không disconnect)
    if (this.socket && this.socket.connected && !this.isSameAuth(auth)) {
      logger.info("Auth thay đổi, giữ socket connection và cập nhật auth", {
        oldUserId: this.lastAuth?.userId,
        newUserId: auth.userId,
      })
      this.lastAuth = { userId: auth.userId, role: auth.role ?? null }
      return this.socket
    }

    this.lastAuth = { userId: auth.userId, role: auth.role ?? null }

    if (this.connectPromise) {
      return this.connectPromise
    }

    this.connectPromise = this.createSocket(auth).catch((error) => {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error("Không thể khởi tạo Socket.IO", err)
      return null
    })

    const socket = await this.connectPromise
    this.connectPromise = null
    return socket
  }

  private isSameAuth(auth: SocketAuthOptions): boolean {
    return (
      this.lastAuth?.userId === auth.userId &&
      (this.lastAuth?.role ?? null) === (auth.role ?? null)
    )
  }

  private async createSocket(auth: SocketAuthOptions): Promise<Socket | null> {
    const endpointAvailable = await this.ensureServerBootstrap()

    if (!endpointAvailable) {
      if (!this.hasLoggedUnavailable) {
        logger.warn("Socket endpoint không khả dụng – bỏ qua kết nối client")
        this.hasLoggedUnavailable = true
      }
      return null
    }

    const { apiRoutes } = await import("@/lib/api/routes")
    const socketPath = withApiBase(apiRoutes.socket)

    logger.info("Đang tạo socket connection (WebSocket only)", {
      userId: auth.userId,
      role: auth.role,
      path: socketPath,
      transport: "websocket",
    })

    const socket = io({
      path: socketPath,
      transports: ["websocket"],
      upgrade: false,
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      forceNew: false,
      auth: {
        userId: auth.userId,
        role: auth.role ?? undefined,
      },
    })

    let connectTimeout: NodeJS.Timeout | null = null

    socket.on("connect", () => {
      if (connectTimeout) {
        clearTimeout(connectTimeout)
        connectTimeout = null
      }
      const engine = socket.io.engine
      logger.success("Đã kết nối thành công với WebSocket", {
        socketId: socket.id,
        transport: engine.transport.name,
        userId: auth.userId,
        role: auth.role,
      })
      this.hasLoggedUnavailable = false
    })

    socket.on("connect_error", (err) => {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logConnectionIssue(error)
    })

    socket.on("disconnect", (reason) => {
      if (connectTimeout) {
        clearTimeout(connectTimeout)
        connectTimeout = null
      }
      logger.info("Đã ngắt kết nối WebSocket", { reason })
    })

    // Timeout để detect nếu connection không thành công
    connectTimeout = setTimeout(() => {
      if (!socket.connected) {
        logger.warn("WebSocket connection timeout", {
          userId: auth.userId,
        })
      }
    }, 20000)

    this.replaceActiveSocket(socket)
    this.attachPendingHandlers(socket)

    return socket
  }

  private replaceActiveSocket(nextSocket: Socket) {
    const previous = this.socket
    if (previous && previous !== nextSocket) {
      // Chỉ disconnect socket cũ nếu đang disconnect (đăng xuất)
      // Nếu không, giữ socket cũ để đảm bảo connection không bị ngắt
      if (this.isDisconnecting) {
        try {
          previous.removeAllListeners()
          previous.disconnect()
        } catch (error) {
          logger.warn(
            "Không thể thu hồi socket cũ",
            error instanceof Error ? error : new Error(String(error)),
          )
        }
      } else {
        // Nếu socket cũ vẫn connected, chỉ remove listeners để tránh duplicate handlers
        // Giữ connection để đảm bảo không bị ngắt
        try {
          previous.removeAllListeners()
        } catch (error) {
          logger.warn(
            "Không thể remove listeners từ socket cũ",
            error instanceof Error ? error : new Error(String(error)),
          )
        }
      }
    }
    this.socket = nextSocket
  }

  private attachPendingHandlers(socket: Socket) {
    for (const [event, handlers] of this.pendingHandlers.entries()) {
    for (const handler of handlers) {
      socket.on(event, handler as Parameters<Socket["on"]>[1])
    }
  }
  }

  private async ensureServerBootstrap(): Promise<boolean> {
    if (!this.bootstrapPromise) {
      logger.info("Bắt đầu bootstrap Socket.IO server")
      this.bootstrapPromise = (async () => {
        try {
          const { apiRoutes } = await import("@/lib/api/routes")
          const socketEndpoint = withApiBase(apiRoutes.socket)
          logger.debug(`Đang gọi ${socketEndpoint} để khởi tạo server`)
          const { apiClient } = await import("@/lib/api/axios")
          await apiClient.get(apiRoutes.socket)
          logger.success("Server đã được khởi tạo thành công")
          return true
        } catch (error) {
          logger.error("Bootstrap error", error instanceof Error ? error : new Error(String(error)))
          this.bootstrapPromise = null
          return false
        }
      })()
    }

    return this.bootstrapPromise
  }

  private logConnectionIssue(error: Error) {
    const normalizedMessage = error.message?.toLowerCase?.() ?? ""
    const key = `${error.name}:${normalizedMessage}`
    const now = Date.now()

    // Throttle logging để tránh spam
    if (this.lastConnectionErrorKey === key && now - this.lastConnectionErrorAt < 5000) {
      return
    }

    this.lastConnectionErrorKey = key
    this.lastConnectionErrorAt = now

    const context = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }

    // Log WebSocket errors với mức độ phù hợp
    if (normalizedMessage.includes("timeout")) {
      logger.warn("WebSocket connection timeout, sẽ thử lại", context)
    } else if (
      normalizedMessage.includes("websocket") &&
      (normalizedMessage.includes("closed before") ||
       normalizedMessage.includes("transport unknown") ||
       normalizedMessage.includes("connection closed"))
    ) {
      logger.warn("WebSocket connection issue, sẽ tự động reconnect", context)
    } else {
      logger.error("WebSocket connection thất bại", error)
    }
  }
}

const socketManager = new SocketManager()

/**
 * Disconnect socket - chỉ gọi khi đăng xuất
 * Export để có thể gọi từ bất kỳ đâu khi cần disconnect
 */
export function disconnectSocket(): void {
  socketManager.disconnect()
}

export function useSocket({ userId, role }: UseSocketOptions) {
  const lastConversationRef = useRef<SocketConversationPair | null>(null)
  const [currentSocket, setCurrentSocket] = useState<Socket | null>(() => socketManager.getSocket())

  useEffect(() => {
    if (!userId) {
      // Khi userId = null, không disconnect socket ngay lập tức
      // Chỉ set state để UI biết, nhưng socket vẫn giữ connection
      // Socket chỉ disconnect khi gọi socketManager.disconnect() (khi đăng xuất)
      const timeoutId = setTimeout(() => {
        setCurrentSocket(null)
      }, 0)
      return () => clearTimeout(timeoutId)
    }

    let cancelled = false

    socketManager
      .connect({ userId, role })
      .then((socket) => {
        if (cancelled) return
        setCurrentSocket(socket ?? null)
      })
      .catch((error) => {
        logger.error(
          "[useSocket] Kết nối Socket.IO thất bại",
          error instanceof Error ? error : new Error(String(error)),
        )
        // Không set null để tránh mất connection, chỉ log error
        // Socket sẽ tự reconnect
      })

    return () => {
      cancelled = true
      // KHÔNG disconnect socket ở đây - chỉ cleanup khi component unmount
      // Socket sẽ tự disconnect khi đăng xuất
    }
  }, [userId, role])

  useEffect(() => {
    const socket = currentSocket
    if (!socket) {
      return
    }
    
    const handleReconnect = () => {
        const conv = lastConversationRef.current
        if (conv) {
          socket.emit("join-conversation", conv)
        }
    }

    socket.on("connect", handleReconnect)

    return () => {
      socket.off("connect", handleReconnect)
    }
  }, [currentSocket])

  const joinConversation = useCallback((a: string, b: string) => {
    const pair: SocketConversationPair = { a, b }
    lastConversationRef.current = pair
    socketManager.withSocket((socket) => {
    socket.emit("join-conversation", pair)
    })
  }, [])

  const leaveConversation = useCallback((a: string, b: string) => {
    const pair: SocketConversationPair = { a, b }
    socketManager.withSocket((socket) => {
    socket.emit("leave-conversation", pair)
    })
  }, [])

  const sendMessage = useCallback(
    ({ parentMessageId, content, fromUserId, toUserId }: SocketMessagePayload) => {
      socketManager.withSocket((socket) => {
      socket.emit("message:send", {
        parentMessageId,
        content,
        fromUserId,
        toUserId,
      } satisfies SocketMessagePayload)
      })
    },
    [],
  )

  const createSocketListener = useCallback(
    <Args extends unknown[]>(event: string, handler: (...args: Args) => void) =>
      socketManager.on(event, handler),
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
    socketManager.withSocket((socket) => {
    socket.emit("notification:read", { notificationId })
    })
  }, [])

  const markAllNotificationsAsRead = useCallback(() => {
    socketManager.withSocket((socket) => {
    socket.emit("notifications:mark-all-read")
    })
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

  const on = useCallback(
    <Args extends unknown[]>(event: string, handler: (...args: Args) => void) =>
      createSocketListener(event, handler),
    [createSocketListener],
  )

  return {
    socket: currentSocket ?? socketManager.getSocket(),
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
    on,
  }
}
