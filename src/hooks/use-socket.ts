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

  getSocket(): Socket | null {
    return this.socket
  }

  withSocket(callback: (socket: Socket) => void): boolean {
    const active = this.socket
    if (!active) return false
    callback(active)
    return true
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

    if (this.socket && this.socket.connected && this.isSameAuth(auth)) {
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

    const host = typeof window !== "undefined" ? window.location.host : ""
    const isVercel = /\.vercel\.app$/i.test(host)

    const selectedTransports = isVercel
      ? (["polling"] as const)
      : (["websocket", "polling"] as const)

    logger.info("Đang tạo socket connection", {
      userId: auth.userId,
      role: auth.role,
      path: socketPath,
      transports: selectedTransports,
    })

    const socket = io({
      path: socketPath,
      transports: selectedTransports as unknown as ("websocket" | "polling")[],
      upgrade: true,
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      forceNew: false,
      auth: {
        userId: auth.userId,
        role: auth.role ?? undefined,
      },
    })

    socket.on("connect", () => {
      const engine = socket.io.engine
      logger.success("Đã kết nối thành công", {
        socketId: socket.id,
        transport: engine.transport.name,
        userId: auth.userId,
        role: auth.role,
      })
      this.hasLoggedUnavailable = false

      engine.once("upgrade", () => {
        logger.debug("Transport upgraded", { transport: engine.transport.name })
      })
    })

    socket.on("connect_error", (err) => {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logConnectionIssue(error)
    })

    socket.on("disconnect", (reason) => {
      logger.info("Đã ngắt kết nối", { reason })
    })

    this.replaceActiveSocket(socket)
    this.attachPendingHandlers(socket)

    return socket
  }

  private replaceActiveSocket(nextSocket: Socket) {
    const previous = this.socket
    if (previous && previous !== nextSocket) {
      try {
        previous.removeAllListeners()
        previous.disconnect()
      } catch (error) {
        logger.warn(
          "Không thể thu hồi socket cũ",
          error instanceof Error ? error : new Error(String(error)),
        )
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

  if (normalizedMessage.includes("timeout") || normalizedMessage.includes("xhr poll")) {
    logger.warn("Socket connection chậm, sẽ thử lại", context)
  } else {
    logger.error("Socket connection thất bại", error)
  }
}
}

const socketManager = new SocketManager()

export function useSocket({ userId, role }: UseSocketOptions) {
  const lastConversationRef = useRef<SocketConversationPair | null>(null)
  const [currentSocket, setCurrentSocket] = useState<Socket | null>(() => socketManager.getSocket())

  useEffect(() => {
    if (!userId) {
      // Use setTimeout to avoid calling setState synchronously in effect body
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
        setCurrentSocket(null)
      })

    return () => {
      cancelled = true
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
