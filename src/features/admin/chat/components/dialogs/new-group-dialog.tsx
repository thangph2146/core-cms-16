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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Users, User } from "lucide-react"
import type { Group } from "@/components/chat/types"

interface UserOption {
  id: string
  name: string | null
  email: string
  avatar: string | null
}

interface NewGroupDialogProps {
  onSelectGroup: (group: Group) => void
}

export function NewGroupDialog({ onSelectGroup }: NewGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [searchValue, setSearchValue] = useState("")
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { user: currentUser } = useAuth()

  const searchUsers = useCallback(async (query: string = "") => {
    setIsLoading(true)
    try {
      const { apiRoutes } = await import("@/lib/api/routes")
      const response = await fetch(`/api${apiRoutes.adminUsers.search(query)}`)
      if (!response.ok) throw new Error("Failed to search users")
      const data = await response.json()
      
      // Filter out current user
      const filtered = data.filter((u: UserOption) => u.id !== currentUser?.id)
      setUsers(filtered)
    } catch (error) {
      console.error("Error searching users:", error)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [currentUser?.id])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value)
      if (value.length === 0 || value.length >= 2) {
        searchUsers(value)
      }
    },
    [searchUsers]
  )

  const handleSelectUser = (user: UserOption) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id))
    } else {
      setSelectedUsers([...selectedUsers, user])
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0 || !currentUser) return

    setIsCreating(true)
    try {
      const { apiRoutes } = await import("@/lib/api/routes")
      const response = await fetch(`/api${apiRoutes.adminGroups.create}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim() || undefined,
          memberIds: selectedUsers.map((u) => u.id),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create group" }))
        throw new Error(errorData.error || "Failed to create group")
      }
      const groupData = await response.json()

      // Map API response to Group type
      const group: Group = {
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        avatar: groupData.avatar,
        createdById: groupData.createdById,
        createdAt: new Date(groupData.createdAt),
        updatedAt: new Date(groupData.updatedAt),
        members: groupData.members.map((m: { id: string; userId: string; role: string; joinedAt?: string; user?: { id: string; name: string | null; email: string; avatar: string | null } }) => ({
          id: m.id,
          groupId: groupData.id,
          userId: m.userId,
          role: m.role,
          joinedAt: new Date(m.joinedAt || groupData.createdAt),
          leftAt: null,
          user: m.user,
        })),
        memberCount: groupData.memberCount || groupData.members.length,
      }

      onSelectGroup(group)
      setOpen(false)
      setGroupName("")
      setGroupDescription("")
      setSelectedUsers([])
      setSearchValue("")
      setUsers([])
    } catch (error) {
      console.error("Error creating group:", error)
    } finally {
      setIsCreating(false)
    }
  }

  useEffect(() => {
    if (open) {
      setSearchValue("")
      searchUsers("")
    } else {
      setUsers([])
      setSearchValue("")
      setSelectedUsers([])
      setGroupName("")
      setGroupDescription("")
    }
  }, [open, searchUsers])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Tạo nhóm chat mới</DialogTitle>
          <DialogDescription>Tạo nhóm chat và thêm thành viên</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Tên nhóm *</Label>
            <Input
              id="group-name"
              placeholder="Nhập tên nhóm..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-description">Mô tả (tùy chọn)</Label>
            <Textarea
              id="group-description"
              placeholder="Nhập mô tả nhóm..."
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Thêm thành viên *</Label>
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Tìm kiếm người dùng..."
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
                {!isLoading && users.length > 0 && (
                  <CommandGroup heading="Kết quả tìm kiếm">
                    {users.map((user) => {
                      const isSelected = selectedUsers.some((u) => u.id === user.id)
                      return (
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
                            {user.name && <span className="text-xs text-muted-foreground truncate">{user.email}</span>}
                          </div>
                          {isSelected && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <User className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Thành viên đã chọn ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar || undefined} alt={user.name || user.email} />
                      <AvatarFallback className="text-xs">
                        {(user.name || user.email).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.name || user.email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id))}
                    >
                      <span className="text-xs">×</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length === 0 || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                "Tạo nhóm"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

