"use client"

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react"
import { useSocket } from "@/hooks/use-socket"
import { useChatSocketBridge } from "./use-chat-socket-bridge"
import type { Contact, Message } from "@/components/chat/types"
import { TEXTAREA_MIN_HEIGHT, TEXTAREA_MAX_HEIGHT } from "@/components/chat/constants"
import {
  calculateMessagesHeight,
  debouncedMarkAsRead,
  getUnreadMessages,
  hasMessagesChanged,
} from "./use-chat-helpers"
import { markMessageAPI, sendMessageAPI, handleAPIError } from "./use-chat-api"
import {
  createOptimisticMessage,
  updateContactMessage,
  removeContactMessage,
  addContactMessage,
  updateMessageReadStatusOptimistic,
} from "./use-chat-message-helpers"
import { isMessageReadByUser } from "@/components/chat/utils/message-helpers"

interface UseChatProps {
  contacts: Contact[]
  currentUserId: string
  role?: string | null
}

export function useChat({ contacts, currentUserId, role }: UseChatProps) {
  const [contactsState, setContactsState] = useState<Contact[]>(contacts)
  const [currentChatState, setCurrentChatState] = useState<Contact | null>(contacts[0] || null)
  
  // Wrapper để auto mark as read khi select contact
  const setCurrentChat = useCallback(
    (contact: Contact | null) => {
      setCurrentChatState(contact)
      
      // Auto mark conversation as read khi user click vào contact
      if (contact && currentUserId) {
        const unreadMessages = getUnreadMessages(contact, currentUserId)
        if (unreadMessages.length > 0) {
          debouncedMarkAsRead(contact.id, contact.type)
        }
      }
    },
    [currentUserId]
  )
  
  // Keep currentChat reference for backward compatibility
  const currentChat = currentChatState
  const [messageInput, setMessageInput] = useState("")
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [textareaHeight, setTextareaHeight] = useState<number>(TEXTAREA_MIN_HEIGHT)
  const [messagesMaxHeight, setMessagesMaxHeight] = useState<number | undefined>(undefined)
  const [messagesMinHeight, setMessagesMinHeight] = useState<number | undefined>(undefined)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const replyBannerRef = useRef<HTMLDivElement>(null)
  const deletedBannerRef = useRef<HTMLDivElement>(null)
  const isSendingRef = useRef(false)
  const prevChatIdRef = useRef<string | undefined>(currentChat?.id)

  // Socket.IO integration
  const { joinConversation, leaveConversation } = useSocket({
    userId: currentUserId,
    role,
  })

  // State to track if current group is deleted
  const [isGroupDeleted, setIsGroupDeleted] = useState(false)
  
  // Auto mark as read callback khi nhận tin nhắn mới trong conversation hiện tại
  const handleMessageReceived = useCallback(
    async (messageId: string, contactId: string, message?: Message) => {
      if (contactId === currentChat?.id && currentUserId && message) {
        // Chỉ mark as read nếu message đó là message mà user nhận được
        // Personal: receiverId === currentUserId
        // Group: groupId exists và senderId !== currentUserId
        const isPersonalMessage = message.receiverId === currentUserId
        const isGroupMessage = message.groupId && message.senderId !== currentUserId
        
        if (isPersonalMessage || isGroupMessage) {
          // Use helper function for consistent logic
          const isAlreadyRead = isMessageReadByUser(message, currentUserId)
          
          if (!isAlreadyRead) {
            try {
              await markMessageAPI(messageId, true)
            } catch {
              // Silently fail - không log error vì có thể message không phải của user
              // hoặc đã được mark as read bởi socket event
            }
          }
        }
      }
    },
    [currentChat?.id, currentUserId]
  )

  // Socket bridge để handle realtime messages (tương tự notifications)
  useChatSocketBridge({
    currentUserId,
    role,
    setContactsState,
    setCurrentChat,
    currentChatId: currentChat?.id || null,
    setIsGroupDeleted,
    onMessageReceived: handleMessageReceived,
  })
  
  // Reset isGroupDeleted when switching chats
  useEffect(() => {
    if (currentChat?.type === "GROUP") {
      setIsGroupDeleted(false)
      // Check if group still exists
      const checkGroupExists = async () => {
        try {
          const { apiRoutes } = await import("@/lib/api/routes")
          const response = await fetch(`/api${apiRoutes.adminGroups.detail(currentChat.id)}`)
          setIsGroupDeleted(response.status === 404)
        } catch {
          setIsGroupDeleted(false)
        }
      }
      checkGroupExists()
    } else {
      setIsGroupDeleted(false)
    }
  }, [currentChat?.id, currentChat?.type])

  const currentMessages = currentChat?.messages || []

  // Update currentChat when contactsState changes
  useEffect(() => {
    if (!currentChatState) return
    const updatedChat = contactsState.find((c) => c.id === currentChatState.id)
    if (updatedChat && hasMessagesChanged(currentChatState.messages, updatedChat.messages, currentUserId)) {
      setCurrentChatState(updatedChat)
      // Trigger mark as read nếu có unread messages
      const unreadMessages = getUnreadMessages(updatedChat, currentUserId)
      if (unreadMessages.length > 0) {
        debouncedMarkAsRead(updatedChat.id, updatedChat.type)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactsState, currentChatState?.id, currentUserId])

  // Clear input and reply when switching chats
  useEffect(() => {
    if (prevChatIdRef.current !== currentChat?.id) {
      setMessageInput("")
      setReplyingTo(null)
      prevChatIdRef.current = currentChat?.id
    }
  }, [currentChat?.id])

  // Auto-resize textarea
  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = "auto"
    const newHeight = Math.min(Math.max(inputRef.current.scrollHeight, TEXTAREA_MIN_HEIGHT), TEXTAREA_MAX_HEIGHT)
    inputRef.current.style.height = `${newHeight}px`
    setTextareaHeight(newHeight)
  }, [messageInput])

  // Sync messages area height with textarea, reply banner, and deleted banner
  useLayoutEffect(() => {
    const updateHeights = () => {
      const { maxHeight, minHeight } = calculateMessagesHeight({
        textareaHeight,
        replyingTo,
        replyBannerRef,
        deletedBannerRef,
        isGroupDeleted,
      })
      setMessagesMaxHeight(maxHeight)
      setMessagesMinHeight(minHeight)
    }
    
    updateHeights()
    
    let rafId: number | null = null
    if ((replyingTo && replyBannerRef.current && !isGroupDeleted) || (isGroupDeleted && deletedBannerRef.current)) {
      rafId = requestAnimationFrame(updateHeights)
    }
    
    window.addEventListener("resize", updateHeights)
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener("resize", updateHeights)
    }
  }, [textareaHeight, replyingTo, isGroupDeleted])

  // Join/leave conversation room when chat changes
  useEffect(() => {
    if (!currentChat || !currentUserId) return

    const chatId = currentChat.id
    joinConversation(currentUserId, chatId)

    return () => {
      leaveConversation(currentUserId, chatId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat?.id, currentUserId, joinConversation, leaveConversation])

  // Socket bridge sẽ handle realtime messages
  // Không cần listener riêng ở đây nữa

  // Auto scroll to bottom
  useEffect(() => {
    if (!messagesEndRef.current || !scrollAreaRef.current) return
    
    const scrollToBottom = () => {
      const viewport = scrollAreaRef.current?.closest('[data-slot="scroll-area"]')?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" })
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }
    }
    
    // Use requestAnimationFrame để đảm bảo DOM đã render
    const rafId = requestAnimationFrame(scrollToBottom)
    return () => cancelAnimationFrame(rafId)
  }, [currentChat?.id, currentMessages.length])

  const handleSendMessage = async () => {
    if (isSendingRef.current || !messageInput.trim() || !currentChat || !currentUserId) return
    isSendingRef.current = true

    const content = messageInput.trim()
    const parentId = replyingTo?.id
    const optimisticMessage = createOptimisticMessage({
      content,
      senderId: currentUserId,
      receiverId: currentChat.type === "GROUP" ? null : currentChat.id,
      groupId: currentChat.type === "GROUP" ? currentChat.id : null,
      parentId,
    })

    setMessageInput("")
    setReplyingTo(null)
    setContactsState((prev) => addContactMessage(prev, currentChat.id, optimisticMessage))

    try {
      const savedMessage = await sendMessageAPI({
        content,
        receiverId: currentChat.type === "GROUP" ? undefined : currentChat.id,
        groupId: currentChat.type === "GROUP" ? currentChat.id : undefined,
        parentId,
      })

      // Update optimistic message ID (socket bridge sẽ handle duplicate)
      setContactsState((prev) =>
        updateContactMessage(prev, currentChat.id, optimisticMessage.id, (msg) => ({
          ...msg,
          id: savedMessage.id,
          timestamp: new Date(savedMessage.timestamp),
        }))
      )
    } catch (error) {
      handleAPIError(error, "Không thể gửi tin nhắn")
      setContactsState((prev) => removeContactMessage(prev, currentChat.id, optimisticMessage.id))
    } finally {
      isSendingRef.current = false
      setMessageInput("")
      inputRef.current?.focus()
    }
  }

  const handleReplyToMessage = (message: Message) => {
    setReplyingTo(message)
    inputRef.current?.focus()
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const addContact = (contact: Contact) => {
    setContactsState((prev) => {
      // Check if contact already exists
      if (prev.some((c) => c.id === contact.id)) {
        return prev
      }
      return [contact, ...prev]
    })
  }

  // Mark message as read/unread (unified handler)
  const markMessageReadStatus = useCallback(
    async (messageId: string, isRead: boolean) => {
      if (!currentChat) return
      
      // Optimistic update
      setContactsState((prev) =>
        updateMessageReadStatusOptimistic(prev, currentChat.id, messageId, isRead, currentUserId)
      )
      
      try {
        await markMessageAPI(messageId, isRead)
      } catch (error) {
        // Rollback
        setContactsState((prev) =>
          updateMessageReadStatusOptimistic(prev, currentChat.id, messageId, !isRead, currentUserId)
        )
        handleAPIError(error, isRead ? "Không thể đánh dấu đã đọc" : "Không thể đánh dấu chưa đọc")
      }
    },
    [currentChat, currentUserId]
  )

  const markMessageAsRead = useCallback(
    (messageId: string) => markMessageReadStatus(messageId, true),
    [markMessageReadStatus]
  )

  const markMessageAsUnread = useCallback(
    (messageId: string) => markMessageReadStatus(messageId, false),
    [markMessageReadStatus]
  )

  // Auto mark conversation as read khi có tin nhắn mới đến (socket bridge sẽ update contactsState)
  // Logic mark as read đã được handle trong setCurrentChat wrapper

  // Scroll to specific message
  const scrollToMessage = useCallback((messageId: string) => {
    // Use requestAnimationFrame để đảm bảo DOM đã render
    requestAnimationFrame(() => {
      const messageElement = document.getElementById(`message-${messageId}`)
      if (messageElement) {
        const viewport = scrollAreaRef.current?.closest('[data-slot="scroll-area"]')?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
        if (viewport) {
          const elementRect = messageElement.getBoundingClientRect()
          const viewportRect = viewport.getBoundingClientRect()
          const scrollTop = viewport.scrollTop + (elementRect.top - viewportRect.top) - 20 // 20px offset from top
          viewport.scrollTo({ top: scrollTop, behavior: "smooth" })
        } else {
          messageElement.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }
    })
  }, [scrollAreaRef])

  return {
    contactsState,
    currentChat,
    setCurrentChat,
    messageInput,
    setMessageInput,
    replyingTo,
    searchQuery,
    setSearchQuery,
    textareaHeight,
    messagesMaxHeight,
    messagesMinHeight,
    messagesEndRef,
    scrollAreaRef,
    inputRef,
    replyBannerRef,
    deletedBannerRef,
    currentMessages,
    handleSendMessage,
    handleKeyDown,
    handleReplyToMessage,
    handleCancelReply,
    addContact,
    markMessageAsRead,
    markMessageAsUnread,
    scrollToMessage,
    setContactsState,
    isGroupDeleted,
  }
}

