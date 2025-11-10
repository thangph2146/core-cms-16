"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { Message, GroupRole } from "../types"
import { EmptyState } from "./empty-state"
import { MessageBubble } from "./message-bubble"
import { DeletedGroupBanner } from "./deleted-group-banner"
import { filterMessagesByQuery, createMessageMap, getParentMessage, deduplicateMessages } from "../utils/message-helpers"

interface MessagesAreaProps {
  messages: Message[]
  currentUserId: string
  messagesMaxHeight?: number
  messagesMinHeight?: number
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onReply?: (message: Message) => void
  onMarkAsRead?: (messageId: string) => void
  onMarkAsUnread?: (messageId: string) => void
  searchQuery?: string
  isGroupDeleted?: boolean
  currentUserRole?: GroupRole
  group?: import("../types").Group | null
  onHardDeleteGroup?: () => void
}

export function MessagesArea({
  messages,
  currentUserId,
  messagesMaxHeight,
  messagesMinHeight,
  scrollAreaRef,
  messagesEndRef,
  onReply,
  onMarkAsRead,
  onMarkAsUnread,
  searchQuery = "",
  isGroupDeleted = false,
  currentUserRole,
  group,
  onHardDeleteGroup,
}: MessagesAreaProps) {
  // Deduplicate messages by ID (tránh duplicate key error)
  const uniqueMessages = deduplicateMessages(messages)
  const messageMap = createMessageMap(uniqueMessages)
  const filteredMessages = filterMessagesByQuery(uniqueMessages, searchQuery)

  const style = {
    maxHeight: messagesMaxHeight ? `${messagesMaxHeight}px` : "calc(100dvh - 13rem)",
    minHeight: messagesMinHeight ? `${messagesMinHeight}px` : "calc(100dvh - 13rem)",
  }

  return (
    <ScrollArea
      style={style}
    >
      <div className="flex flex-col p-4 gap-2" ref={scrollAreaRef}>
        {filteredMessages.length > 0 ? (
          <>
            {searchQuery.trim() && (
              <div className="text-xs text-muted-foreground text-center py-2">
                Tìm thấy {filteredMessages.length} tin nhắn
              </div>
            )}
            {filteredMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.senderId === currentUserId}
                parentMessage={getParentMessage(message, messageMap)}
                currentUserId={currentUserId}
                onReply={onReply}
                onMarkAsRead={onMarkAsRead}
                onMarkAsUnread={onMarkAsUnread}
                searchQuery={searchQuery}
              />
            ))}
            <div ref={messagesEndRef} />
            {isGroupDeleted && (
              <DeletedGroupBanner
                currentUserRole={currentUserRole}
                group={group}
                onHardDeleteGroup={onHardDeleteGroup}
              />
            )}
          </>
        ) : searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Không tìm thấy tin nhắn nào</p>
            <p className="text-xs text-muted-foreground mt-1">Thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : isGroupDeleted ? (
          <>
            <EmptyState variant="messages" />
            <DeletedGroupBanner
              currentUserRole={currentUserRole}
              group={group}
              onHardDeleteGroup={onHardDeleteGroup}
            />
          </>
        ) : (
          <EmptyState variant="messages" />
        )}
      </div>
    </ScrollArea>
  )
}

