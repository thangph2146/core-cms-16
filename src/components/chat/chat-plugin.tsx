"use client"

import { useState, FormEvent, useRef, useCallback } from "react"
import { Bot, Paperclip, Mic, Send, Sparkles, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/chat/component/chat-bubble"
import {
  ChatBuilder,
  ChatBuilderHeader,
  ChatBuilderBody,
  ChatBuilderFooter,
  type ChatPosition,
  type ChatSize,
} from "@/components/chat/component/chat-builder"
import { ChatMessageList } from "@/components/chat/component/chat-message-list"
import { ChatInput } from "@/components/chat/component/chat-input"
import { cn } from "@/lib/utils"

export interface ChatMessage {
  id: string | number
  content: string
  sender: "user" | "ai" | "system"
  timestamp?: Date
  avatar?: string
  avatarFallback?: string
}

export interface ChatPluginProps {
  // Configuration
  position?: ChatPosition
  size?: ChatSize
  renderPage?: boolean
  className?: string
  
  // Customization
  title?: string
  description?: string
  icon?: React.ReactNode
  placeholder?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
  
  // Recipient info for header (người gửi tin nhắn tới)
  recipientInfo?: {
    name?: string
    email?: string
    avatar?: string
    status?: "online" | "offline" | "away"
  }
  showRecipientInfo?: boolean
  
  // Messages
  initialMessages?: ChatMessage[]
  onSendMessage?: (message: string) => Promise<string | void>
  onMessageSent?: (message: ChatMessage) => void
  onMessageReceived?: (message: ChatMessage) => void
  
  // Features
  showAttachButton?: boolean
  showMicrophoneButton?: boolean
  showTimestamp?: boolean
  maxInputRows?: number
  minInputRows?: number
  
  // Custom renderers
  renderHeader?: (props: { title?: string; description?: string; recipientInfo?: ChatPluginProps["recipientInfo"] }) => React.ReactNode
  renderEmptyState?: () => React.ReactNode
  renderFooter?: (props: {
    input: string
    isLoading: boolean
    onSend: (e: FormEvent) => void
    onAttach: () => void
    onMicrophone: () => void
  }) => React.ReactNode
}

export function ChatPlugin({
  position = "bottom-right",
  size = "md",
  renderPage = false,
  className,
  title = "Chat với AI",
  description = "Hỏi tôi bất cứ điều gì về hệ thống",
  icon,
  placeholder = "Nhập tin nhắn của bạn... (Enter để gửi, Shift+Enter để xuống dòng)",
  emptyStateTitle = "Chưa có tin nhắn",
  emptyStateDescription = "Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn đầu tiên của bạn",
  recipientInfo,
  showRecipientInfo = true,
  initialMessages = [],
  onSendMessage,
  onMessageSent,
  onMessageReceived,
  showAttachButton = true,
  showMicrophoneButton = true,
  showTimestamp = true,
  maxInputRows = 5,
  minInputRows = 1,
  renderHeader,
  renderEmptyState,
  renderFooter,
}: ChatPluginProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  // Get recipient info from messages if not provided
  // Lấy thông tin từ tin nhắn đầu tiên có sender !== "user"
  const getRecipientFromMessages = useCallback(() => {
    const recipientMessage = messages.find(msg => msg.sender !== "user")
    if (recipientMessage) {
      return {
        name: recipientMessage.sender === "ai" ? "AI Assistant" : recipientMessage.sender === "system" ? "System" : "Người dùng",
        email: undefined,
        avatar: recipientMessage.avatar,
        status: "online" as const,
      }
    }
    return undefined
  }, [messages])
  
  const currentRecipientInfo = recipientInfo || getRecipientFromMessages()
  
  const getUserInitials = (name?: string | null) => {
    if (!name) return "AI"
    const parts = name.trim().split(" ")
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase()
  }

  const formatTime = useCallback((date?: Date) => {
    if (!date) return ""
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      const userMessage: ChatMessage = {
        id: Date.now(),
        content: input.trim(),
        sender: "user",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      onMessageSent?.(userMessage)
      setInput("")
      setIsLoading(true)

      try {
        // Call custom handler if provided
        if (onSendMessage) {
          const response = await onSendMessage(input.trim())
          
          if (response) {
            const aiMessage: ChatMessage = {
              id: Date.now() + 1,
              content: response,
              sender: "ai",
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, aiMessage])
            onMessageReceived?.(aiMessage)
          }
        } else {
          // Default: Simulate AI response
          setTimeout(() => {
            const aiMessage: ChatMessage = {
              id: Date.now() + 1,
              content: "Cảm ơn bạn đã liên hệ! Tôi đã nhận được tin nhắn của bạn.",
              sender: "ai",
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, aiMessage])
            onMessageReceived?.(aiMessage)
            setIsLoading(false)
          }, 1000 + Math.random() * 1000)
        }
      } catch (error) {
        console.error("Error sending message:", error)
        const errorMessage: ChatMessage = {
          id: Date.now() + 1,
          content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.",
          sender: "system",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    },
    [input, isLoading, onSendMessage, onMessageSent, onMessageReceived]
  )

  const handleEnter = useCallback(() => {
    if (input.trim() && !isLoading) {
      const syntheticEvent = {
        preventDefault: () => {},
      } as FormEvent<HTMLFormElement>
      handleSubmit(syntheticEvent)
    }
  }, [input, isLoading, handleSubmit])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value)
    },
    []
  )

  const handleAttachFile = useCallback(() => {
    // TODO: Implement file attachment
    console.log("Attach file")
  }, [])

  const handleMicrophoneClick = useCallback(() => {
    // TODO: Implement voice input
    console.log("Voice input")
  }, [])

  const defaultIcon = icon || <Bot className="h-6 w-6" />

  return (
    <ChatBuilder
      size={size}
      position={position}
      icon={defaultIcon}
      renderPage={renderPage}
      className={className}
    >
      {/* Header */}
      {renderHeader ? (
        renderHeader({ title, description, recipientInfo: currentRecipientInfo })
      ) : (
        <ChatBuilderHeader className="px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {showRecipientInfo && currentRecipientInfo ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentRecipientInfo.avatar} alt={currentRecipientInfo.name || "Recipient"} />
                  <AvatarFallback>
                    {getUserInitials(currentRecipientInfo.name)}
                  </AvatarFallback>
                </Avatar>
                {currentRecipientInfo.status === "online" && (
                  <Circle className="absolute bottom-0 right-0 h-3 w-3 fill-green-500 text-green-500 border-2 border-background rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">
                  {currentRecipientInfo.name || "AI Assistant"}
                </h3>
                {currentRecipientInfo.email ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {currentRecipientInfo.email}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">
                    {description || "Đang trực tuyến"}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                {typeof defaultIcon === "object" && "type" in defaultIcon ? (
                  defaultIcon
                ) : (
                  <Bot className="h-6 w-6 text-primary" />
                )}
                <Sparkles className="h-3 w-3 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {title}
                </h1>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                )}
              </div>
            </div>
          )}
        </ChatBuilderHeader>
      )}

      {/* Body */}
      <ChatBuilderBody className="bg-muted/30">
        <ChatMessageList>
          {messages.length === 0 ? (
            renderEmptyState ? (
              renderEmptyState()
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{emptyStateTitle}</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {emptyStateDescription}
                </p>
              </div>
            )
          ) : (
            messages.map((message, index) => (
              <ChatBubble
                key={message.id}
                variant={message.sender === "user" ? "sent" : "received"}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ChatBubbleAvatar
                  className="h-9 w-9 shrink-0 ring-2 ring-background"
                  src={message.avatar}
                  fallback={
                    message.avatarFallback ||
                    (message.sender === "user" ? "US" : message.sender === "ai" ? "AI" : "SYS")
                  }
                />
                <div className="flex flex-col gap-1 max-w-[80%] sm:max-w-[70%]">
                  <ChatBubbleMessage
                    variant={message.sender === "user" ? "sent" : "received"}
                    className={cn(
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : message.sender === "system"
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : "bg-background border shadow-sm"
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </ChatBubbleMessage>
                  {showTimestamp && message.timestamp && (
                    <span
                      className={cn(
                        "text-xs text-muted-foreground px-2",
                        message.sender === "user" ? "text-right" : "text-left"
                      )}
                    >
                      {formatTime(message.timestamp)}
                    </span>
                  )}
                </div>
              </ChatBubble>
            ))
          )}

          {isLoading && (
            <ChatBubble variant="received" className="animate-in fade-in">
              <ChatBubbleAvatar
                className="h-9 w-9 shrink-0 ring-2 ring-background"
                fallback="AI"
              />
              <ChatBubbleMessage
                isLoading
                className="bg-background border shadow-sm"
              />
            </ChatBubble>
          )}
        </ChatMessageList>
      </ChatBuilderBody>

      {/* Footer */}
      {renderFooter ? (
        renderFooter({
          input,
          isLoading,
          onSend: handleSubmit,
          onAttach: handleAttachFile,
          onMicrophone: handleMicrophoneClick,
        })
      ) : (
        <ChatBuilderFooter className="px-4 py-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <form
            onSubmit={handleSubmit}
            className="h-full relative flex items-end gap-2"
          >
            <div className="flex-1 relative rounded-lg border bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
              <ChatInput
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onEnter={handleEnter}
                placeholder={placeholder}
                disabled={isLoading}
                maxRows={maxInputRows}
                minRows={minInputRows}
                className="pr-0 border-0 focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {showAttachButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={handleAttachFile}
                  className="h-9 w-9 hover:bg-muted rounded-lg"
                  title="Đính kèm file"
                >
                  <Paperclip className="size-4" />
                </Button>
              )}

              {showMicrophoneButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={handleMicrophoneClick}
                  className="h-9 w-9 hover:bg-muted rounded-lg"
                  title="Ghi âm"
                >
                  <Mic className="size-4" />
                </Button>
              )}

              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "h-9 w-9 transition-all rounded-lg",
                  !input.trim() || isLoading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:scale-105"
                )}
                title="Gửi tin nhắn (Enter)"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </form>
        </ChatBuilderFooter>
      )}
    </ChatBuilder>
  )
}

