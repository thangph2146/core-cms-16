"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CardDescription, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ArrowLeft, Search } from "lucide-react"
import type { Contact, Message } from "../types"
import { filterMessagesByQuery } from "../utils/message-helpers"
import { MessageSearchSheet } from "./message-search-sheet"

interface ChatHeaderProps {
  contact: Contact
  onBack?: () => void
  showBackButton?: boolean
  searchQuery?: string
  onSearchChange?: (query: string) => void
  currentMessages?: Message[]
  onScrollToMessage?: (messageId: string) => void
  groupManagementMenu?: React.ReactNode
}

export function ChatHeader({ 
  contact, 
  onBack, 
  showBackButton = false,
  searchQuery = "",
  onSearchChange,
  currentMessages = [],
  onScrollToMessage,
  groupManagementMenu,
}: ChatHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Sync local state with prop
  useEffect(() => {
    if (!isSearchOpen && searchQuery) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setIsSearchOpen(true), 0)
    }
  }, [searchQuery, isSearchOpen])

  const handleSearchChange = (value: string) => {
    onSearchChange?.(value)
  }

  const handleCloseSearch = () => {
    onSearchChange?.("")
    setIsSearchOpen(false)
  }

  // Filter messages by search query
  const filteredMessages = filterMessagesByQuery(currentMessages, searchQuery)

  const handleMessageClick = (messageId: string) => {
    onScrollToMessage?.(messageId)
    setIsSearchOpen(false)
    onSearchChange?.("")
  }

  return (
    <>
      <div className="flex items-center gap-3 h-16 px-4 border-b shrink-0">
        {showBackButton && onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={contact.image || undefined} alt={contact.name} />
          <AvatarFallback className="text-xs">{contact.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-sm font-semibold truncate">{contact.name}</CardTitle>
          <CardDescription className="text-xs truncate">
            {contact.type === "GROUP" ? `${contact.group?.memberCount || 0} thành viên` : "Contact Info"}
          </CardDescription>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {contact.type === "GROUP" && groupManagementMenu}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Tìm kiếm tin nhắn</SheetTitle>
          </SheetHeader>
          <MessageSearchSheet
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onClose={handleCloseSearch}
            messages={filteredMessages}
            onMessageClick={handleMessageClick}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

