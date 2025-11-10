/**
 * Hook để quản lý Socket.IO real-time updates cho Chat
 * Pattern tương tự useNotificationsSocketBridge
 * 
 * Theo schema.prisma Message model:
 * - id: String (cuid)
 * - senderId: String? (nullable)
 * - receiverId: String (required)
 * - content: String
 * - type: MessageType (PERSONAL, NOTIFICATION, etc.)
 * - isRead: Boolean
 * - parentId: String? (for replies)
 */

"use client"

import { useEffect } from "react"
import { useSocket } from "@/hooks/use-socket"
import type { Contact, Message } from "@/components/chat/types"
import { logger } from "@/lib/config"

interface UseChatSocketBridgeProps {
  currentUserId: string
  role?: string | null
  setContactsState: React.Dispatch<React.SetStateAction<Contact[]>>
}

export function useChatSocketBridge({
  currentUserId,
  role,
  setContactsState,
}: UseChatSocketBridgeProps) {
  const { socket, onMessageNew, onMessageUpdated } = useSocket({
    userId: currentUserId,
    role,
  })

  useEffect(() => {
    if (!currentUserId) return

    // Helper: Convert socket payload to Message format (theo schema.prisma)
    const convertToMessage = (payload: {
      id?: string
      content: string
      fromUserId: string
      toUserId: string
      timestamp?: number
      parentMessageId?: string
      isRead?: boolean
    }): Message => ({
      id: payload.id || `msg-${payload.timestamp || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: payload.content,
      senderId: payload.fromUserId,
      receiverId: payload.toUserId,
      timestamp: new Date(payload.timestamp || Date.now()),
      isRead: payload.isRead ?? payload.toUserId !== currentUserId,
      type: "PERSONAL",
      parentId: payload.parentMessageId || null,
    })

    const stopNew = onMessageNew((payload) => {
      logger.debug("Socket message:new received", {
        userId: currentUserId,
        messageId: payload.id,
        fromUserId: payload.fromUserId,
        toUserId: payload.toUserId,
      })

      // Chỉ xử lý messages NHẬN ĐƯỢC (tương tự notifications chỉ check toUserId)
      // Skip messages từ current user (đã được handle bởi optimistic update + replace)
      if (payload.toUserId !== currentUserId) {
        logger.debug("Message not for current user, skipping", {
          toUserId: payload.toUserId,
          currentUserId,
        })
        return
      }

      // Xác định contact (người gửi) và trạng thái unread
      const contactId = payload.fromUserId
      const isUnread = true // Messages nhận được luôn là unread ban đầu
      const newMessage = convertToMessage(payload)

      // Update state (functional update để tránh stale closure)
      setContactsState((prev) =>
        prev.map((contact) => {
          if (contact.id !== contactId) return contact

          // Check duplicate: ưu tiên check bằng ID nếu có
          const exists = payload.id
            ? contact.messages.some((msg) => msg.id === payload.id)
            : contact.messages.some(
                (msg) =>
                  msg.content === newMessage.content &&
                  msg.senderId === newMessage.senderId &&
                  Math.abs(msg.timestamp.getTime() - newMessage.timestamp.getTime()) < 2000
              )

          if (exists) {
            logger.debug("Message already exists, skipping", { contactId, messageId: newMessage.id })
            return contact
          }

          return {
            ...contact,
            messages: [...contact.messages, newMessage],
            lastMessage: newMessage.content,
            lastMessageTime: newMessage.timestamp,
            unreadCount: isUnread ? contact.unreadCount + 1 : contact.unreadCount,
          }
        })
      )
    })

    const stopUpdated = onMessageUpdated((payload) => {
      logger.debug("Socket message:updated received", {
        userId: currentUserId,
        messageId: payload.id,
        fromUserId: payload.fromUserId,
        toUserId: payload.toUserId,
      })

      // Chỉ xử lý messages của current user (receiver)
      if (payload.toUserId !== currentUserId) return

      const contactId = payload.fromUserId

      // Update message isRead status từ payload
      setContactsState((prev) =>
        prev.map((contact) => {
          if (contact.id !== contactId) return contact

          const messageIndex = contact.messages.findIndex((msg) => msg.id === payload.id)
          if (messageIndex === -1) return contact

          const currentMessage = contact.messages[messageIndex]
          const wasUnread = !currentMessage.isRead
          const isNowRead = payload.isRead ?? true // Default to true if not provided
          
          // Update message với isRead status từ payload
          const updatedMessages = [...contact.messages]
          updatedMessages[messageIndex] = {
            ...currentMessage,
            isRead: isNowRead,
          }

          // Update unreadCount: giảm nếu mark as read, tăng nếu mark as unread
          const unreadCount =
            wasUnread !== !isNowRead
              ? isNowRead
                ? Math.max(0, contact.unreadCount - 1)
                : contact.unreadCount + 1
              : contact.unreadCount

          return {
            ...contact,
            messages: updatedMessages,
            unreadCount,
          }
        })
      )
    })

    return () => {
      stopNew?.()
      stopUpdated?.()
    }
  }, [currentUserId, role, onMessageNew, onMessageUpdated, setContactsState])

  return { socket }
}

