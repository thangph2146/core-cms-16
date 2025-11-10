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
          debouncedMarkAsRead(contact.id)
        }
      }
    },
    [currentUserId]
  )
  
  // Keep currentChat reference for backward compatibility
  const currentChat = currentChatState
  const [messageInput, setMessageInput] = useState("")
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [textareaHeight, setTextareaHeight] = useState<number>(TEXTAREA_MIN_HEIGHT)
  const [messagesMaxHeight, setMessagesMaxHeight] = useState<number | undefined>(undefined)
  const [messagesMinHeight, setMessagesMinHeight] = useState<number | undefined>(undefined)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const replyBannerRef = useRef<HTMLDivElement>(null)
  const isSendingRef = useRef(false)
  const prevChatIdRef = useRef<string | undefined>(currentChat?.id)

  // Socket.IO integration
  const { joinConversation, leaveConversation } = useSocket({
    userId: currentUserId,
    role,
  })

  // Socket bridge để handle realtime messages (tương tự notifications)
  useChatSocketBridge({
    currentUserId,
    role,
    setContactsState,
  })

  const currentMessages = currentChat?.messages || []

  // Update currentChat when contactsState changes
  useEffect(() => {
    if (!currentChatState) return
    const updatedChat = contactsState.find((c) => c.id === currentChatState.id)
    if (updatedChat && hasMessagesChanged(currentChatState.messages, updatedChat.messages)) {
      setCurrentChatState(updatedChat)
      // Trigger mark as read nếu có unread messages
      const unreadMessages = getUnreadMessages(updatedChat, currentUserId)
      if (unreadMessages.length > 0) {
        debouncedMarkAsRead(updatedChat.id)
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

  // Sync messages area height with textarea and reply banner
  // Use useLayoutEffect để update trước khi browser paint, tránh flicker
  useLayoutEffect(() => {
    const updateHeights = () => {
      const { maxHeight, minHeight } = calculateMessagesHeight({
        textareaHeight,
        replyingTo,
        replyBannerRef,
      })
      setMessagesMaxHeight(maxHeight)
      setMessagesMinHeight(minHeight)
    }
    
    // Update ngay lập tức (useLayoutEffect chạy đồng bộ trước paint)
    updateHeights()
    
    // Sau đó đo lại chính xác nếu cần (cho trường hợp element chưa render)
    let rafId: number | null = null
    if (replyingTo && replyBannerRef.current) {
      rafId = requestAnimationFrame(updateHeights)
    }
    
    window.addEventListener("resize", updateHeights)
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener("resize", updateHeights)
    }
  }, [textareaHeight, replyingTo])

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
    const parentId = replyingTo?.id || undefined

    // Optimistically add message to UI
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: currentUserId,
      receiverId: currentChat.id,
      timestamp: new Date(),
      isRead: false,
      type: "PERSONAL",
      parentId: parentId || null,
    }

    setMessageInput("")
    setReplyingTo(null)
    setContactsState((prev) =>
      prev.map((contact) =>
        contact.id === currentChat.id
          ? {
              ...contact,
              messages: [...contact.messages, optimisticMessage],
              lastMessage: content,
              lastMessageTime: optimisticMessage.timestamp,
            }
          : contact
      )
    )

    try {
      // Persist to database via API (server will emit socket event)
      const savedMessage = await sendMessageAPI({
        content,
        receiverId: currentChat.id,
        parentId,
      })

      // Replace optimistic message with saved one (from API response)
      // Socket event sẽ được handle bởi socket bridge, nhưng cần update ID ngay để tránh duplicate
      setContactsState((prev) =>
        prev.map((contact) =>
          contact.id === currentChat.id
            ? {
                ...contact,
                messages: contact.messages.map((msg) =>
                  msg.id === optimisticMessage.id
                    ? {
                        ...msg,
                        id: savedMessage.id,
                        timestamp: new Date(savedMessage.timestamp),
                      }
                    : msg
                ),
              }
            : contact
        )
      )
    } catch (error) {
      handleAPIError(error, "Không thể gửi tin nhắn")
      
      // Remove optimistic message on error
      setContactsState((prev) =>
        prev.map((contact) =>
          contact.id === currentChat.id
            ? {
                ...contact,
                messages: contact.messages.filter((msg) => msg.id !== optimisticMessage.id),
              }
            : contact
        )
      )
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

  // Mark message as read/unread
  const markMessageAsRead = useCallback(
    async (messageId: string) => {
      if (!currentChat) return
      try {
        await markMessageAPI(messageId, true)
        // Socket event sẽ update state tự động
      } catch (error) {
        handleAPIError(error, "Không thể đánh dấu đã đọc")
      }
    },
    [currentChat]
  )

  const markMessageAsUnread = useCallback(
    async (messageId: string) => {
      if (!currentChat) return
      try {
        await markMessageAPI(messageId, false)
        // Socket event sẽ update state tự động
      } catch (error) {
        handleAPIError(error, "Không thể đánh dấu chưa đọc")
      }
    },
    [currentChat]
  )

  // Auto mark conversation as read khi có tin nhắn mới đến (socket bridge sẽ update contactsState)
  // Logic mark as read đã được handle trong setCurrentChat wrapper

  return {
    contactsState,
    currentChat,
    setCurrentChat,
    messageInput,
    setMessageInput,
    replyingTo,
    textareaHeight,
    messagesMaxHeight,
    messagesMinHeight,
    messagesEndRef,
    scrollAreaRef,
    inputRef,
    replyBannerRef,
    currentMessages,
    handleSendMessage,
    handleKeyDown,
    handleReplyToMessage,
    handleCancelReply,
    addContact,
    markMessageAsRead,
    markMessageAsUnread,
  }
}

