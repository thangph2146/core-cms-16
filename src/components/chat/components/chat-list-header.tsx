"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CircleOff,
  CircleUserRound,
  ListFilter,
  MessageSquareDashed,
  MessageSquareDot,
  SquarePen,
  Star,
  Users,
} from "lucide-react"
import type { Contact } from "../types"

interface ChatListHeaderProps {
  onNewConversation?: (contact: Contact) => void // Deprecated: sử dụng newConversationDialog thay thế
  existingContactIds?: string[] // Deprecated: sử dụng newConversationDialog thay thế
  newConversationDialog?: React.ReactNode // Cho phép inject business component từ bên ngoài
}

export function ChatListHeader({ 
  onNewConversation: _onNewConversation, 
  existingContactIds: _existingContactIds, 
  newConversationDialog 
}: ChatListHeaderProps) {
  return (
    <div className="flex items-center justify-between h-14 px-4 border-b shrink-0">
      <h2 className="text-lg font-semibold">Chats</h2>
      <div className="flex items-center gap-1">
        {newConversationDialog}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <SquarePen className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Users className="mr-2 h-4 w-4" /> New Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ListFilter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter Chats By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <MessageSquareDot className="mr-2 h-4 w-4" /> Unread
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Star className="mr-2 h-4 w-4" /> Favorites
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CircleUserRound className="mr-2 h-4 w-4" /> Contacts
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CircleOff className="mr-2 h-4 w-4" /> Non Contacts
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Users className="mr-2 h-4 w-4" /> Groups
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquareDashed className="mr-2 h-4 w-4" /> Drafts
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

