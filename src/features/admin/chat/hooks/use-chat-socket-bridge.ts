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
import {
  updateMessageReadStatus,
  updateContactInState,
  filterContactInState,
} from "./use-chat-socket-helpers"
import { isMessageUnreadByUser } from "@/components/chat/utils/message-helpers"
import { calculateUnreadCount } from "./use-chat-helpers"
import { logger } from "@/lib/config"

interface UseChatSocketBridgeProps {
  currentUserId: string
  role?: string | null
  setContactsState: React.Dispatch<React.SetStateAction<Contact[]>>
  setCurrentChat?: (contact: Contact | null) => void
  currentChatId?: string | null
  setIsGroupDeleted?: (deleted: boolean) => void
  onMessageReceived?: (messageId: string, contactId: string, message: Message) => void // Callback khi nhận tin nhắn mới
}

export function useChatSocketBridge({
  currentUserId,
  role,
  setContactsState,
  setCurrentChat,
  currentChatId,
  setIsGroupDeleted,
  onMessageReceived,
}: UseChatSocketBridgeProps) {
  const { socket, onMessageNew, onMessageUpdated } = useSocket({
    userId: currentUserId,
    role,
  })

  useEffect(() => {
    if (!currentUserId) return

    // Helper: Convert socket payload to Message format
    const convertToMessage = (payload: {
      id?: string
      content: string
      fromUserId: string
      toUserId?: string
      groupId?: string
      timestamp?: number
      parentMessageId?: string
      isRead?: boolean
      readers?: { id: string; name: string | null; email: string; avatar: string | null }[]
    }): Message => ({
      id: payload.id || `msg-${payload.timestamp || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: payload.content,
      senderId: payload.fromUserId,
      receiverId: payload.toUserId || null,
      groupId: payload.groupId || null,
      timestamp: new Date(payload.timestamp || Date.now()),
      isRead: payload.isRead ?? (payload.groupId ? false : payload.toUserId !== currentUserId),
      type: "PERSONAL",
      parentId: payload.parentMessageId || null,
      readers: payload.readers || undefined, // Include readers array for group messages
    })

    // Helper: Get contact ID from payload
    const getContactId = (payload: { groupId?: string; toUserId?: string; fromUserId?: string }): string | null => {
      if (payload.groupId) return payload.groupId
      if (payload.toUserId === currentUserId) return payload.fromUserId || null
      if (payload.fromUserId === currentUserId && payload.toUserId) return payload.toUserId
      return null
    }

    const stopNew = onMessageNew((payload) => {
      logger.debug("Socket message:new received", { messageId: payload.id })

      const contactId = getContactId(payload)
      if (!contactId) {
        logger.debug("Message not for current user, skipping")
        return
      }

      // Update state (functional update để tránh stale closure)
      setContactsState((prev) => {
        // Check duplicate
        const messageExists = prev.some((contact) =>
          contact.messages.some((msg) => {
            if (payload.id && msg.id === payload.id) return true
            return (
              msg.content === payload.content &&
              msg.senderId === payload.fromUserId &&
              Math.abs(msg.timestamp.getTime() - (payload.timestamp || Date.now())) < 2000
            )
          })
        )

        if (messageExists) {
          logger.debug("Message already exists, skipping", { contactId, messageId: payload.id })
          return prev
        }

        const isCurrentChat = currentChatId === contactId
        const newMessage = convertToMessage(payload)
        
        // Use helper function for consistent logic
        const isUnread = isMessageUnreadByUser(newMessage, currentUserId)

        // Auto mark as read nếu đang ở conversation này
        if (isCurrentChat && isUnread && payload.id) {
          onMessageReceived?.(payload.id, contactId, newMessage)
        }

        let contactFound = false
        const updatedContacts = prev.map((contact) => {
          if (contact.id !== contactId) return contact
          contactFound = true

          const contactWithMessage: Contact = {
            ...contact,
            messages: [...contact.messages, newMessage],
            lastMessage: newMessage.content,
            lastMessageTime: newMessage.timestamp,
          }

          return {
            ...contactWithMessage,
            unreadCount: calculateUnreadCount(contactWithMessage, currentUserId),
          }
        })

        if (contactFound) {
          return updatedContacts
        }

        // If contact not found (new conversation), create placeholder contact
        const placeholder: Contact = {
          id: contactId,
          name: payload.groupId
            ? "Nhóm mới"
            : payload.fromUserId === currentUserId
              ? payload.toUserId || "Liên hệ mới"
              : payload.fromUserId || "Liên hệ mới",
          email: undefined,
          image: null,
          lastMessage: newMessage.content,
          lastMessageTime: newMessage.timestamp,
          unreadCount: isUnread ? 1 : 0,
          isOnline: false,
          messages: [newMessage],
          type: payload.groupId ? "GROUP" : "PERSONAL",
          group: undefined,
          isDeleted: false,
        }

        return [placeholder, ...prev]
      })
    })

    const stopUpdated = onMessageUpdated((payload) => {
      logger.debug("Socket message:updated received", { messageId: payload.id, readers: payload.readers })

      const contactId = getContactId(payload)
      if (!contactId || !payload.id) return

      setContactsState((prev) =>
        updateMessageReadStatus(prev, contactId, payload.id, payload.isRead ?? true, payload.readers, currentUserId)
      )
    })

    // Handle group events
    if (!socket) return

    const handleGroupUpdated = (payload: { id: string; name: string; description?: string | null; avatar?: string | null; memberCount: number }) => {
      logger.debug("Socket group:updated received", { groupId: payload.id })
      
      setContactsState((prev) =>
        prev.map((contact) => {
          if (contact.id !== payload.id || contact.type !== "GROUP") return contact
          
          return {
            ...contact,
            name: payload.name,
            image: payload.avatar || undefined,
            group: contact.group ? {
              ...contact.group,
              name: payload.name,
              description: payload.description || undefined,
              avatar: payload.avatar || undefined,
              memberCount: payload.memberCount,
            } : undefined,
          }
        })
      )
    }

    const handleGroupDeleted = (payload: { id: string }) => {
      logger.debug("Socket group:deleted received", { groupId: payload.id })
      
      // Mark group as deleted instead of removing it
      setContactsState((prev) =>
        prev.map((contact) => {
          if (contact.id === payload.id && contact.type === "GROUP") {
            return {
              ...contact,
              isDeleted: true,
            }
          }
          return contact
        })
      )
      
      // Mark as deleted if the deleted group is currently being viewed
      if (setIsGroupDeleted && currentChatId === payload.id) {
        setIsGroupDeleted(true)
        // Clear currentChat after a delay to show the deleted message
        if (setCurrentChat) {
          setTimeout(() => {
            setCurrentChat(null)
          }, 3000)
        }
      } else if (setCurrentChat && currentChatId === payload.id) {
        setCurrentChat(null)
      }
    }

    const handleGroupRemoved = (payload: { groupId: string }) => {
      logger.debug("Socket group:removed received", { groupId: payload.groupId })
      
      setContactsState((prev) =>
        filterContactInState(prev, (contact) => !(contact.id === payload.groupId && contact.type === "GROUP"))
      )
      
      // Clear currentChat if the removed group is currently being viewed
      if (setCurrentChat && currentChatId === payload.groupId) {
        setCurrentChat(null)
      }
    }

    const handleGroupHardDeleted = (payload: { id: string }) => {
      logger.debug("Socket group:hard-deleted received", { groupId: payload.id })
      
      setContactsState((prev) =>
        filterContactInState(prev, (contact) => !(contact.id === payload.id && contact.type === "GROUP"))
      )
      
      // Clear currentChat if the hard deleted group is currently being viewed
      if (setCurrentChat && currentChatId === payload.id) {
        setCurrentChat(null)
      }
      if (setIsGroupDeleted && currentChatId === payload.id) {
        setIsGroupDeleted(false)
      }
    }

    const handleGroupRestored = (payload: { id: string }) => {
      logger.debug("Socket group:restored received", { groupId: payload.id })
      
      setContactsState((prev) =>
        updateContactInState(prev, payload.id, (contact) =>
          contact.type === "GROUP" ? { ...contact, isDeleted: false } : contact
        )
      )
      
      // Clear isGroupDeleted if the restored group is currently being viewed
      if (setIsGroupDeleted && currentChatId === payload.id) {
        setIsGroupDeleted(false)
      }
    }

    const handleMessageDeleted = (payload: { id: string; groupId?: string }) => {
      logger.debug("Socket message:deleted received", { messageId: payload.id })
      setContactsState((prev) =>
        prev.map((contact) => ({
          ...contact,
          messages: contact.messages.map((msg) =>
            msg.id === payload.id ? { ...msg, deletedAt: new Date() } : msg
          ),
        }))
      )
    }

    const handleMessageHardDeleted = (payload: { id: string; groupId?: string }) => {
      logger.debug("Socket message:hard-deleted received", { messageId: payload.id })
      setContactsState((prev) =>
        prev.map((contact) => ({
          ...contact,
          messages: contact.messages.filter((msg) => msg.id !== payload.id),
        }))
      )
    }

    const handleMessageRestored = (payload: { id: string; groupId?: string }) => {
      logger.debug("Socket message:restored received", { messageId: payload.id })
      setContactsState((prev) =>
        prev.map((contact) => ({
          ...contact,
          messages: contact.messages.map((msg) =>
            msg.id === payload.id ? { ...msg, deletedAt: undefined } : msg
          ),
        }))
      )
    }

    socket.on("group:updated", handleGroupUpdated)
    socket.on("group:deleted", handleGroupDeleted)
    socket.on("group:hard-deleted", handleGroupHardDeleted)
    socket.on("group:restored", handleGroupRestored)
    socket.on("group:removed", handleGroupRemoved)
    socket.on("message:deleted", handleMessageDeleted)
    socket.on("message:hard-deleted", handleMessageHardDeleted)
    socket.on("message:restored", handleMessageRestored)

    return () => {
      stopNew?.()
      stopUpdated?.()
      if (socket) {
        socket.off("group:updated", handleGroupUpdated)
        socket.off("group:deleted", handleGroupDeleted)
        socket.off("group:hard-deleted", handleGroupHardDeleted)
        socket.off("group:restored", handleGroupRestored)
        socket.off("group:removed", handleGroupRemoved)
        socket.off("message:deleted", handleMessageDeleted)
        socket.off("message:hard-deleted", handleMessageHardDeleted)
        socket.off("message:restored", handleMessageRestored)
      }
    }
  }, [currentUserId, role, socket, onMessageNew, onMessageUpdated, setContactsState, setCurrentChat, currentChatId, setIsGroupDeleted, onMessageReceived])

  return { socket }
}
