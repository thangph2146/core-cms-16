/**
 * Shared ChatWindow component để tránh duplicate code
 * Sử dụng cho cả desktop và mobile
 */

"use client"

import type { Contact, Message, GroupRole } from "../types"
import { ChatHeader } from "./chat-header"
import { MessagesArea } from "./messages-area"
import { ChatInput } from "./chat-input"

export interface ChatWindowProps {
  currentChat: Contact
  currentUserId: string
  currentMessages: Message[]
  messagesMaxHeight?: number
  messagesMinHeight?: number
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  replyBannerRef: React.RefObject<HTMLDivElement | null>
  deletedBannerRef?: React.RefObject<HTMLDivElement | null>
  messageInput: string
  setMessageInput: (value: string) => void
  replyingTo: Message | null
  handleSendMessage: () => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleReplyToMessage: (message: Message) => void
  handleCancelReply: () => void
  markMessageAsRead: (messageId: string) => void
  markMessageAsUnread: (messageId: string) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onScrollToMessage?: (messageId: string) => void
  groupManagementMenu?: React.ReactNode
  isGroupDeleted?: boolean
  currentUserRole?: GroupRole
  onHardDeleteGroup?: () => void
  onBack?: () => void
  showBackButton?: boolean
  role?: string | null
  setContactsState?: React.Dispatch<React.SetStateAction<any[]>>
}

export function ChatWindow({
  currentChat,
  currentUserId,
  currentMessages,
  messagesMaxHeight,
  messagesMinHeight,
  scrollAreaRef,
  messagesEndRef,
  inputRef,
  replyBannerRef,
  deletedBannerRef,
  messageInput,
  setMessageInput,
  replyingTo,
  handleSendMessage,
  handleKeyDown,
  handleReplyToMessage,
  handleCancelReply,
  markMessageAsRead,
  markMessageAsUnread,
  searchQuery,
  onSearchChange,
  onScrollToMessage,
  groupManagementMenu,
  isGroupDeleted = false,
  currentUserRole,
  onHardDeleteGroup,
  onBack,
  showBackButton,
  role,
  setContactsState,
}: ChatWindowProps) {
  return (
    <>
      <ChatHeader 
        contact={currentChat} 
        onBack={onBack} 
        showBackButton={showBackButton}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        currentMessages={currentMessages}
        onScrollToMessage={onScrollToMessage}
        groupManagementMenu={groupManagementMenu}
      />
      <MessagesArea
        messages={currentMessages}
        currentUserId={currentUserId}
        messagesMaxHeight={messagesMaxHeight}
        messagesMinHeight={messagesMinHeight}
        scrollAreaRef={scrollAreaRef}
        messagesEndRef={messagesEndRef}
        onReply={handleReplyToMessage}
        onMarkAsRead={markMessageAsRead}
        onMarkAsUnread={markMessageAsUnread}
        searchQuery={searchQuery}
        onScrollToMessage={onScrollToMessage}
        isGroupDeleted={isGroupDeleted}
        currentUserRole={currentUserRole}
        group={currentChat.type === "GROUP" ? currentChat.group : null}
        onHardDeleteGroup={onHardDeleteGroup}
        role={role}
        setContactsState={setContactsState}
      />
      <ChatInput
        inputRef={inputRef}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        handleKeyDown={handleKeyDown}
        handleSendMessage={handleSendMessage}
        currentChat={currentChat}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        replyBannerRef={replyBannerRef}
        deletedBannerRef={deletedBannerRef}
        isGroupDeleted={isGroupDeleted}
      />
    </>
  )
}
