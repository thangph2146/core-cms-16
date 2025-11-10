"use client"

import type { Message } from "../types"
import { formatMessageTime } from "../utils"
import { highlightText } from "../utils/text-helpers"

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

  return (
    <div 
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} group`}
      data-message-id={message.id}
      id={`message-${message.id}`}
    >
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 cursor-pointer hover:opacity-90 transition-opacity relative ${
          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
        onClick={() => onReply?.(message)}
      >
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
                if (message.isRead) {
                  onMarkAsUnread?.(message.id)
                } else {
                  onMarkAsRead?.(message.id)
                }
              }}
              className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded ${
                message.isRead
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-primary hover:text-primary/80"
              }`}
              title={message.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
            >
              {message.isRead ? "✓ Đã đọc" : "○ Chưa đọc"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

