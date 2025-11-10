"use client"

import type { Message } from "../types"
import { formatMessageTime } from "../utils"
import { highlightText } from "../utils/text-helpers"
import { isMessageReadByUser } from "../utils/message-helpers"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
  parentMessage?: Message | null
  currentUserId?: string
  onReply?: (message: Message) => void
  onMarkAsRead?: (messageId: string) => void
  onMarkAsUnread?: (messageId: string) => void
  searchQuery?: string
}

export function MessageBubble({
  message,
  isOwnMessage,
  parentMessage,
  currentUserId,
  onReply,
  onMarkAsRead,
  onMarkAsUnread,
  searchQuery = "",
}: MessageBubbleProps) {
  const isParentOwnMessage = parentMessage?.senderId === currentUserId
  const canMarkRead = !isOwnMessage && (message.receiverId === currentUserId || (message.groupId && message.senderId !== currentUserId))
  
  // Hiển thị sender info cho group messages (không phải own message)
  const showSenderInfo = message.groupId && !isOwnMessage && message.sender
  const senderName = message.sender?.name || message.sender?.email || "Unknown"
  
  // Check if message is read by current user (for group messages: check readers array)
  const isReadByCurrentUser = isMessageReadByUser(message, currentUserId)

  return (
    <div 
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} group gap-2 flex-col`}
      data-message-id={message.id}
      id={`message-${message.id}`}
    >
      <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} gap-2`}>
        {showSenderInfo && message.sender && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={message.sender.avatar || undefined} alt={senderName} />
            <AvatarFallback>
              {senderName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={`max-w-[70%] rounded-lg px-4 py-2 cursor-pointer hover:opacity-90 transition-opacity relative ${
            isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
          onClick={() => onReply?.(message)}
        >
          {showSenderInfo && (
            <p className={`text-xs font-medium mb-1 ${
              isOwnMessage ? "text-primary-foreground/80" : "text-muted-foreground"
            }`}>
              {senderName}
            </p>
          )}
          {parentMessage && (
            <div className={`mb-2 pb-2 border-l-2 pl-2 ${
              isOwnMessage ? "border-primary-foreground/30" : "border-muted-foreground/30"
            }`}>
              <p className={`text-xs font-medium ${
                isOwnMessage ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}>
                {isParentOwnMessage ? "You" : "Reply"}
              </p>
              <p className={`text-xs truncate ${
                isOwnMessage ? "text-primary-foreground/60" : "text-muted-foreground/80"
              }`}>
                {searchQuery ? highlightText(parentMessage.content, searchQuery) : parentMessage.content}
              </p>
            </div>
          )}
          <p className="text-sm break-words">
            {searchQuery ? highlightText(message.content, searchQuery) : message.content}
          </p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className={`text-xs ${
              isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
            }`}>
              {formatMessageTime(message.timestamp)}
            </p>
            {canMarkRead && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (isReadByCurrentUser) {
                    onMarkAsUnread?.(message.id)
                  } else {
                    onMarkAsRead?.(message.id)
                  }
                }}
                className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded ${
                  isReadByCurrentUser
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-primary hover:text-primary/80"
                }`}
                title={isReadByCurrentUser ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
              >
                {isReadByCurrentUser ? "✓ Đã đọc" : "○ Chưa đọc"}
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Hiển thị avatar list của readers cho group messages - nằm ngoài message bubble */}
      {message.groupId && message.readers && message.readers.length > 0 && (
        <div className={`flex items-center gap-1 ${isOwnMessage ? "justify-end" : "justify-start"} mt-1`}>
          {message.readers.slice(0, 5).map((reader) => (
            <Avatar key={reader.id} className="h-5 w-5 border-2 border-background">
              <AvatarImage src={reader.avatar || undefined} alt={reader.name || reader.email} />
              <AvatarFallback className="text-[10px]">
                {(reader.name || reader.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {message.readers.length > 5 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              +{message.readers.length - 5}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

