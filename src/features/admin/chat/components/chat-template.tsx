"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import type { ChatTemplateProps } from "@/components/chat/types"
import { useChat } from "../hooks/use-chat"
import { ChatListHeader } from "@/components/chat/components/chat-list-header"
import { NewConversationDialog } from "./new-conversation-dialog"
import { ContactList } from "@/components/chat/components/contact-list"
import { ChatWindow } from "@/components/chat/components/chat-window"
import { EmptyState } from "@/components/chat/components/empty-state"

export function ChatTemplate({ contacts, currentUserId, role, onNewConversation }: ChatTemplateProps) {
  const isMobile = useIsMobile()
  const {
    contactsState,
    currentChat,
    setCurrentChat,
    messageInput,
    setMessageInput,
    replyingTo,
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
  } = useChat({ contacts, currentUserId, role })

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
              onNewConversation={(contact) => {
                addContact(contact)
                setCurrentChat(contact)
                onNewConversation?.(contact)
              }}
              existingContactIds={contactsState.map((c) => c.id)}
              newConversationDialog={
                <NewConversationDialog
                  onSelectUser={(contact) => {
                    addContact(contact)
                    setCurrentChat(contact)
                    onNewConversation?.(contact)
                  }}
                  existingContactIds={contactsState.map((c) => c.id)}
                />
              }
            />
            <ContactList
              contacts={contactsState}
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
          {currentChat ? (
            <div className="flex flex-col h-full bg-background">
              <ChatWindow
                currentChat={currentChat}
                currentUserId={currentUserId}
                currentMessages={currentMessages}
                messagesMaxHeight={messagesMaxHeight}
                messagesMinHeight={messagesMinHeight}
                scrollAreaRef={scrollAreaRef}
                messagesEndRef={messagesEndRef}
                inputRef={inputRef}
                replyBannerRef={replyBannerRef}
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                replyingTo={replyingTo}
                handleSendMessage={handleSendMessage}
                handleKeyDown={handleKeyDown}
                handleReplyToMessage={handleReplyToMessage}
                handleCancelReply={handleCancelReply}
                markMessageAsRead={markMessageAsRead}
                markMessageAsUnread={markMessageAsUnread}
              />
            </div>
          ) : (
            <EmptyState variant="no-chat" />
          )}
        </ResizablePanel>

        {/* Mobile Chat Window */}
        {isMobile && currentChat && (
          <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
            <ChatWindow
              currentChat={currentChat}
              currentUserId={currentUserId}
              currentMessages={currentMessages}
              messagesMaxHeight={messagesMaxHeight}
              messagesMinHeight={messagesMinHeight}
              scrollAreaRef={scrollAreaRef}
              messagesEndRef={messagesEndRef}
              inputRef={inputRef}
              replyBannerRef={replyBannerRef}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              replyingTo={replyingTo}
              handleSendMessage={handleSendMessage}
              handleKeyDown={handleKeyDown}
              handleReplyToMessage={handleReplyToMessage}
              handleCancelReply={handleCancelReply}
              markMessageAsRead={markMessageAsRead}
              markMessageAsUnread={markMessageAsUnread}
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
