"use client"

"use client"

import { useState, useCallback, useEffect } from "react"
import { useAuth } from "@/hooks/use-session"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, User } from "lucide-react"
import { logger } from "@/lib/config"
import { requestJson } from "@/lib/api/client"
import { withApiBase } from "@/lib/config/api-paths"
import type { Contact } from "@/components/chat/types"

interface UserOption {
  id: string
  name: string | null
  email: string
  avatar: string | null
}

interface NewConversationDialogProps {
  onSelectUser: (user: Contact) => void
  existingContactIds?: string[]
}

export function NewConversationDialog({ onSelectUser, existingContactIds = [] }: NewConversationDialogProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [users, setUsers] = useState<UserOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { user: currentUser } = useAuth()

  const searchUsers = useCallback(async (query: string = "") => {
    setIsLoading(true)
    try {
      const { apiRoutes } = await import("@/lib/api/routes")
      const res = await requestJson<UserOption[]>(withApiBase(apiRoutes.adminUsers.search(query)))
      if (!res.ok) throw new Error(res.error || "Failed to search users")
      const data = Array.isArray(res.data) ? res.data : []
      const filtered = data.filter(
        (u: UserOption) => u.id !== currentUser?.id && !existingContactIds.includes(u.id)
      )
      setUsers(filtered)
    } catch (error) {
      logger.error("Error searching users", error as Error)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [currentUser?.id, existingContactIds])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value)
      if (value.length === 0 || value.length >= 2) {
        searchUsers(value)
      }
    },
    [searchUsers]
  )

  useEffect(() => {
    if (open) {
      setSearchValue("")
      searchUsers("")
    } else {
      setUsers([])
      setSearchValue("")
    }
  }, [open, searchUsers])

  const handleSelectUser = (user: UserOption) => {
    const contact: Contact = {
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      image: user.avatar,
      lastMessage: "",
      lastMessageTime: new Date(),
      unreadCount: 0,
      isOnline: false,
      messages: [],
    }
    onSelectUser(contact)
    setOpen(false)
    setSearchValue("")
    setUsers([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <User className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chọn người để trò chuyện</DialogTitle>
          <DialogDescription>Tìm kiếm và chọn người dùng để bắt đầu cuộc trò chuyện mới</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchValue}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Đang tải...</span>
              </div>
            )}
            {!isLoading && users.length === 0 && searchValue.length >= 2 && (
              <CommandEmpty>Không tìm thấy người dùng nào</CommandEmpty>
            )}
            {!isLoading && users.length === 0 && searchValue.length === 0 && (
              <CommandEmpty>Không có người dùng nào</CommandEmpty>
            )}
            {!isLoading && users.length > 0 && (
              <CommandGroup heading={searchValue.length >= 2 ? "Kết quả tìm kiếm" : "Danh sách người dùng"}>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => handleSelectUser(user)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || undefined} alt={user.name || user.email} />
                      <AvatarFallback className="text-xs">
                        {(user.name || user.email).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{user.name || user.email}</span>
                      {user.name && <span className="text-xs truncate">{user.email}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
