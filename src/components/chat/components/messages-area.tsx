"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { Message, GroupRole } from "../types"
import { EmptyState } from "./empty-state"
import { MessageBubble } from "./message-bubble"
import { DeletedGroupBanner } from "./deleted-group-banner"
import { filterMessagesByQuery, createMessageMap, getParentMessage } from "../utils/message-helpers"

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
  onHardDeleteGroup,
}: MessagesAreaProps) {
  const messageMap = createMessageMap(messages)
  const filteredMessages = filterMessagesByQuery(messages, searchQuery)

  const style = {
    maxHeight: messagesMaxHeight ? `${messagesMaxHeight}px` : "calc(100dvh - 13rem)",
    minHeight: messagesMinHeight ? `${messagesMinHeight}px` : "calc(100dvh - 13rem)",
  }

  return (
    <ScrollArea
      style={style}
    >
      <div className="flex flex-col p-4 gap-2" ref={scrollAreaRef}>
        {isGroupDeleted && (
          <DeletedGroupBanner
            currentUserRole={currentUserRole}
            onHardDeleteGroup={onHardDeleteGroup}
          />
        )}
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
          </>
        ) : searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Không tìm thấy tin nhắn nào</p>
            <p className="text-xs text-muted-foreground mt-1">Thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : (
          <EmptyState variant="messages" />
        )}
      </div>
    </ScrollArea>
  )
}

