"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import type { ChatTemplateProps, Contact, Group } from "@/components/chat/types"
import { useChat } from "../hooks/use-chat"
import { ChatListHeader, type ChatFilterType } from "@/components/chat/components/chat-list-header"
import { NewConversationDialog } from "./dialogs/new-conversation-dialog.client"
import { NewGroupDialog } from "./dialogs/new-group-dialog.client"
import { GroupManagementMenu } from "./group-management-menu.client"
import { ContactList } from "@/components/chat/components/contact-list"
import { ChatWindow } from "@/components/chat/components/chat-window"
import { EmptyState } from "@/components/chat/components/empty-state"
import { useState, useMemo, useCallback, useEffect } from "react"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { requestJson } from "@/lib/api/client"
import { withApiBase } from "@/lib/config/api-paths"
import { getCurrentUserRole, createGroupContact } from "./chat-template-helpers"
import { useGroupActions } from "../hooks/use-group-actions"
import { filterContacts } from "@/components/chat/utils/contact-helpers"
import { mapGroupListItemToContact, type GroupListItemLike, type MessageDetailLike } from "../utils/contact-transformers"
import type { ChatWindowProps } from "@/components/chat/components/chat-window"
import { logger } from "@/lib/config"

export function ChatTemplate({
  contacts,
  currentUserId,
  role,
  initialFilterType = "ACTIVE",
  onNewConversation,
  onNewGroup,
}: ChatTemplateProps) {
  const isMobile = useIsMobile()
  const [filterType, setFilterType] = useState<ChatFilterType>(initialFilterType)
  const [contactSearch, setContactSearch] = useState("")
  const [searchedContacts, setSearchedContacts] = useState<Contact[] | null>(null)
  const [isChatListOpen, setIsChatListOpen] = useState(false)
  
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
  const currentChatId = currentChat?.id ?? null

  // Function to fetch deleted groups
  const fetchDeletedGroups = useCallback(async () => {
    try {
      const { apiRoutes } = await import("@/lib/api/routes")
      const listRoute = apiRoutes.adminGroups.list({ page: 1, limit: 50 })
      const separator = listRoute.includes("?") ? "&" : "?"
      const requestUrl = `${listRoute}${separator}includeDeleted=true`
      const response = await requestJson<{ data?: GroupListItemLike[] } | GroupListItemLike[]>(withApiBase(requestUrl))
      if (response.ok && response.data) {
        const responseData = response.data
        const payload = Array.isArray(responseData) ? responseData : responseData?.data || []
        const deletedGroupContacts: Contact[] = (payload as GroupListItemLike[])
          .filter((groupData) => Boolean(groupData.deletedAt))
          .map((groupData) =>
            mapGroupListItemToContact({
              groupData,
              messages: [],
              currentUserId,
            })
          )
        
        setContactsState((prev) => {
          const personalContacts = prev.filter((c) => c.type === "PERSONAL")
          const activeGroups = prev.filter((c) => c.type === "GROUP" && !c.isDeleted)
          return [...personalContacts, ...activeGroups, ...deletedGroupContacts]
        })
      }
    } catch (error) {
      logger.error("Error fetching deleted groups", error as Error)
    }
  }, [setContactsState, currentUserId])

  // Group actions hook (for refresh and cleanup)
  const { handleGroupUpdated, handleHardDeleteGroup } = useGroupActions({
    currentChat,
    setCurrentChat,
    setContactsState,
    onHardDeleteSuccess: filterType === "DELETED" ? fetchDeletedGroups : undefined, // Refresh deleted groups list if on DELETED filter
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
  const baseFilteredContacts = useMemo(
    () => filterContacts(contactsState, filterType),
    [contactsState, filterType]
  )

  // Debounced API search for contacts (conversations + groups)
  const debouncedSearchContacts = useDebouncedCallback(async (query: string) => {
    const q = query.trim()
    if (q.length < 2) {
      setSearchedContacts(null)
      return
    }
    try {
      const { apiRoutes } = await import("@/lib/api/routes")

      // Build endpoints
      const convUrl = withApiBase(apiRoutes.adminConversations.list({ page: 1, limit: 50, search: q }))
      const groupsBase = apiRoutes.adminGroups.list({ page: 1, limit: 50, search: q })
      const groupsUrl = withApiBase(
        `${groupsBase}${groupsBase.includes("?") ? "&" : "?"}includeDeleted=${filterType === "DELETED"}`
      )

      const [convRes, groupsRes] = await Promise.all([
        requestJson(convUrl),
        requestJson(groupsUrl),
      ])

      const results: Contact[] = []

      // Map conversations to Contact
      if (convRes.ok && convRes.data) {
        // Handle both nested structure { data: { data: [...] } } and direct array
        let conversationsList: Array<{
          otherUser: { id: string; name: string | null; email: string; avatar: string | null }
          lastMessage: { content: string; timestamp: string | Date } | null
          unreadCount: number
          updatedAt: string | Date
        }> = []

        // Check if data is nested (has .data property) or direct array
        if (Array.isArray(convRes.data)) {
          conversationsList = convRes.data
        } else if (typeof convRes.data === 'object' && convRes.data !== null && 'data' in convRes.data) {
          const responseData = convRes.data as { data?: Array<{
            otherUser: { id: string; name: string | null; email: string; avatar: string | null }
            lastMessage: { content: string; timestamp: string | Date } | null
            unreadCount: number
            updatedAt: string | Date
          }> }
          if (Array.isArray(responseData.data)) {
            conversationsList = responseData.data
          }
        }

        for (const conv of conversationsList) {
          const existing = contactsState.find((c) => c.id === conv.otherUser.id && c.type !== "GROUP")
          results.push({
            id: conv.otherUser.id,
            name: conv.otherUser.name || conv.otherUser.email,
            email: conv.otherUser.email,
            image: conv.otherUser.avatar,
            lastMessage: conv.lastMessage?.content || "",
            lastMessageTime: new Date(conv.lastMessage?.timestamp || conv.updatedAt),
            unreadCount: conv.unreadCount ?? (existing?.unreadCount || 0),
            isOnline: existing?.isOnline || false,
            messages: existing?.messages || [],
            type: "PERSONAL",
            isDeleted: false,
          })
        }
      }

      // Map groups to Contact
      if (groupsRes.ok && groupsRes.data) {
        // Handle both nested structure { data: { data: [...] } } and direct array
        let groupsList: Array<GroupListItemLike> = []

        // Check if data is nested (has .data property) or direct array
        if (Array.isArray(groupsRes.data)) {
          groupsList = groupsRes.data
        } else if (typeof groupsRes.data === 'object' && groupsRes.data !== null && 'data' in groupsRes.data) {
          const responseData = groupsRes.data as { data?: Array<GroupListItemLike> }
          if (Array.isArray(responseData.data)) {
            groupsList = responseData.data
          }
        }

        for (const groupData of groupsList) {
          const mapped = mapGroupListItemToContact({ groupData, messages: [], currentUserId })
          // Try to reuse existing messages if we already have this group
          const existing = contactsState.find((c) => c.id === mapped.id && c.type === "GROUP")
          if (existing) {
            mapped.messages = existing.messages
            mapped.unreadCount = existing.unreadCount
          }
          // Respect deleted filter
          if (filterType === "DELETED" && !mapped.isDeleted) continue
          if (filterType === "ACTIVE" && mapped.isDeleted) continue
          results.push(mapped)
        }
      }

      // Sort by lastMessageTime desc
      results.sort((a, b) => (b.lastMessageTime?.getTime?.() || 0) - (a.lastMessageTime?.getTime?.() || 0))

      setSearchedContacts(results)
    } catch (err) {
      logger.error("Search contacts failed", err as Error)
      setSearchedContacts([])
    }
  }, 300)

  // Trigger debounced search when typing, filter, or contacts change
  useEffect(() => {
    debouncedSearchContacts(contactSearch)
    return () => {
      debouncedSearchContacts.cancel()
    }
  }, [contactSearch, debouncedSearchContacts, filterType, contactsState])

  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim()
    // If query is less than 2 characters, show base filtered contacts
    if (query.length < 2) {
      return baseFilteredContacts
    }
    // If query is 2+ characters, show search results
    // Use empty array if searchedContacts is null (still loading) to show empty state
    return searchedContacts ?? []
  }, [contactSearch, searchedContacts, baseFilteredContacts])

  // Ensure current chat always belongs to the visible filter bucket
  useEffect(() => {
    // While searching contacts, don't auto-switch the current chat selection
    if (contactSearch.trim()) return

    if (!filteredContacts.length) {
      if (currentChatId) {
        setCurrentChat(null)
      }
      return
    }

    const isCurrentVisible = currentChatId
      ? filteredContacts.some((contact) => contact.id === currentChatId)
      : false

    if (!isCurrentVisible) {
      setCurrentChat(filteredContacts[0])
    }
  }, [filteredContacts, currentChatId, setCurrentChat, contactSearch])

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
            role,
            setContactsState,
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
      role,
      setContactsState,
    ]
  )

  const groupMenu = useMemo(
    () =>
      currentChat?.type === "GROUP" && currentChat.group && !isGroupDeleted ? (
        <GroupManagementMenu
          group={currentChat.group}
          currentUserRole={currentUserRole}
          onGroupUpdated={handleGroupUpdated}
          currentUserId={currentUserId}
          role={role}
          setContactsState={setContactsState}
        />
      ) : undefined,
    [currentChat, isGroupDeleted, currentUserRole, handleGroupUpdated, currentUserId, role, setContactsState]
  )

  // Determine if mobile chat window should be shown
  const showMobileChatWindow = isMobile && chatWindowProps !== null

  // Handle contact selection - close sheet on mobile when contact is selected
  const handleContactSelect = useCallback(async (contact: Contact) => {
    // If personal contact and no messages loaded, fetch messages via API
    if (contact.type !== "GROUP" && (!contact.messages || contact.messages.length === 0)) {
      try {
        const { apiRoutes } = await import("@/lib/api/routes")
        const url = withApiBase(apiRoutes.adminConversations.list({ otherUserId: contact.id }))
        const res = await requestJson(url)
        if (res.ok && Array.isArray(res.data)) {
          const { mapMessageDetailToMessage } = await import("../utils/contact-transformers")
          const messages = (res.data as Array<MessageDetailLike>).map(
            mapMessageDetailToMessage,
          )
          setContactsState((prev) => {
            const exists = prev.find((c) => c.id === contact.id && c.type !== "GROUP")
            if (exists) {
              return prev.map((c) => (c.id === contact.id && c.type !== "GROUP" ? { ...c, messages } : c))
            }
            return [{ ...contact, messages }, ...prev]
          })
          setCurrentChat({ ...contact, messages })
          if (isMobile) {
            setIsChatListOpen(false)
          }
          return
        }
      } catch (e) {
        logger.error("Failed to fetch conversation messages", e as Error)
      }
    }
    setCurrentChat(contact)
    if (isMobile) {
      setIsChatListOpen(false)
    }
  }, [isMobile, setContactsState, setCurrentChat])

  // Chat List Content Component (reusable for both desktop and mobile)
  const chatListContent = (
    <div className="flex flex-col h-full bg-background">
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
        onContactSelect={handleContactSelect}
        searchValue={contactSearch}
        onSearchChange={setContactSearch}
      />
    </div>
  )

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Desktop: ResizablePanelGroup */}
      {!isMobile ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
          {/* Left Panel - Chat List */}
          <ResizablePanel
            defaultSize={30}
            minSize={25}
            maxSize={50}
            className="flex flex-col min-w-0"
          >
            <div className="flex flex-col h-full border-r bg-background">
              {chatListContent}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Chat Window */}
          <ResizablePanel
            defaultSize={70}
            minSize={50}
            className="flex flex-col min-w-0"
          >
            {chatWindowProps ? (
              <div className="flex flex-col h-full bg-background">
                <ChatWindow {...chatWindowProps} groupManagementMenu={groupMenu} />
              </div>
            ) : (
              <EmptyState variant="no-chat" />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        /* Mobile: Sheet for Chat List */
        <>
          {/* Mobile Chat List Sheet */}
          <Sheet open={isChatListOpen} onOpenChange={setIsChatListOpen}>
            <SheetContent side="left" className="w-full sm:max-w-sm p-0">
              <SheetTitle className="sr-only">Danh sách chat</SheetTitle>
              {chatListContent}
            </SheetContent>
          </Sheet>

          {/* Mobile: Show Chat List Button when no chat is selected */}
          {!showMobileChatWindow && (
            <div className="flex flex-1 flex-col h-full">
              <div className="flex items-center gap-2 h-14 px-4 border-b shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsChatListOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Chats</h2>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <EmptyState variant="no-chat" />
              </div>
            </div>
          )}

          {/* Mobile Chat Window */}
          {showMobileChatWindow && chatWindowProps && (
            <div className="fixed top-16 bottom-0 left-0 right-0 z-30 flex flex-col bg-background md:hidden">
              <ChatWindow
                {...chatWindowProps}
                groupManagementMenu={groupMenu}
                onBack={() => {
                  setCurrentChat(null)
                  setIsChatListOpen(true)
                }}
                showBackButton
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Re-export types for convenience
export type { Message, Contact, MessageType, ChatTemplateProps } from "@/components/chat/types"
