"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import type { ChatTemplateProps, Contact, Group } from "@/components/chat/types"
import { useChat } from "../hooks/use-chat"
import { ChatListHeader, type ChatFilterType } from "@/components/chat/components/chat-list-header"
import { NewConversationDialog } from "./dialogs/new-conversation-dialog"
import { NewGroupDialog } from "./dialogs/new-group-dialog"
import { GroupManagementMenu } from "./group-management-menu"
import { ContactList } from "@/components/chat/components/contact-list"
import { ChatWindow } from "@/components/chat/components/chat-window"
import { EmptyState } from "@/components/chat/components/empty-state"
import { useState, useMemo } from "react"
import { getCurrentUserRole, createGroupContact } from "./chat-template-helpers"
import { useGroupActions } from "../hooks/use-group-actions"
import { filterContacts } from "@/components/chat/utils/contact-helpers"
import type { ChatWindowProps } from "@/components/chat/components/chat-window"

export function ChatTemplate({ contacts, currentUserId, role, onNewConversation, onNewGroup }: ChatTemplateProps) {
  const isMobile = useIsMobile()
  const [filterType, setFilterType] = useState<ChatFilterType>("ACTIVE")
  
  const {
    contactsState,
    currentChat,
    setCurrentChat,
    setContactsState,
    messageInput,
    setMessageInput,
    replyingTo,
    searchQuery,
    setSearchQuery,
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
    isGroupDeleted,
  } = useChat({ contacts, currentUserId, role })

  const currentUserRole = getCurrentUserRole(currentChat, currentUserId)

  // Group actions hook
  const { handleGroupUpdated, handleHardDeleteGroup } = useGroupActions({
    currentChat,
    currentUserRole,
    setCurrentChat,
    setContactsState,
  })

  // Handlers for new conversation/group
  const handleNewConversation = (contact: Contact) => {
    addContact(contact)
    setCurrentChat(contact)
    onNewConversation?.(contact)
  }

  const handleNewGroup = (group: Group) => {
    const groupContact = createGroupContact(group)
    addContact(groupContact)
    setCurrentChat(groupContact)
    onNewGroup?.(group)
  }
  
  // Filter contacts based on filterType
  const filteredContacts = useMemo(
    () => filterContacts(contactsState, filterType),
    [contactsState, filterType]
  )

  // Shared ChatWindow props để tránh duplicate
  const chatWindowProps: ChatWindowProps | null = useMemo(
    () =>
      currentChat
        ? {
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
            onSearchChange: setSearchQuery,
            onScrollToMessage: scrollToMessage,
            isGroupDeleted,
            currentUserRole,
            onHardDeleteGroup: isGroupDeleted ? handleHardDeleteGroup : undefined,
          }
        : null,
    [
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
      setSearchQuery,
      scrollToMessage,
      isGroupDeleted,
      currentUserRole,
      handleHardDeleteGroup,
    ]
  )

  const groupMenu = useMemo(
    () =>
      currentChat?.type === "GROUP" && currentChat.group && !isGroupDeleted ? (
        <GroupManagementMenu
          group={currentChat.group}
          currentUserRole={currentUserRole}
          onGroupUpdated={handleGroupUpdated}
        />
      ) : undefined,
    [currentChat, isGroupDeleted, currentUserRole, handleGroupUpdated]
  )

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
        {/* Left Panel - Chat List */}
        <ResizablePanel
          defaultSize={isMobile ? 100 : 30}
          minSize={isMobile ? 100 : 25}
          maxSize={isMobile ? 100 : 50}
          className="flex flex-col min-w-0"
        >
          <div className="flex flex-col h-full border-r bg-background">
            <ChatListHeader
              onNewConversation={handleNewConversation}
              existingContactIds={contactsState.map((c) => c.id)}
              newConversationDialog={
                <NewConversationDialog
                  onSelectUser={handleNewConversation}
                  existingContactIds={contactsState.map((c) => c.id)}
                />
              }
              newGroupDialog={
                <NewGroupDialog onSelectGroup={handleNewGroup} />
              }
              filterType={filterType}
              onFilterChange={setFilterType}
            />
            <ContactList
              contacts={filteredContacts}
              selectedContactId={currentChat?.id}
              onContactSelect={setCurrentChat}
            />
          </div>
        </ResizablePanel>

        {!isMobile && <ResizableHandle withHandle />}

        {/* Right Panel - Chat Window */}
        <ResizablePanel
          defaultSize={isMobile ? 0 : 70}
          minSize={isMobile ? 0 : 50}
          className={`flex flex-col min-w-0 ${isMobile ? "hidden" : ""}`}
        >
          {chatWindowProps ? (
            <div className="flex flex-col h-full bg-background">
              <ChatWindow {...chatWindowProps} groupManagementMenu={groupMenu} />
            </div>
          ) : (
            <EmptyState variant="no-chat" />
          )}
        </ResizablePanel>

        {/* Mobile Chat Window */}
        {isMobile && chatWindowProps && (
          <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
            <ChatWindow
              {...chatWindowProps}
              groupManagementMenu={groupMenu}
              onBack={() => setCurrentChat(null)}
              showBackButton
            />
          </div>
        )}
      </ResizablePanelGroup>
    </div>
  )
}

// Re-export types for convenience
export type { Message, Contact, MessageType, ChatTemplateProps } from "@/components/chat/types"
