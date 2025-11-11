"use client"

import { useState, useCallback } from "react"
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
import { Loader2, Users } from "lucide-react"
import type { Group, GroupMember } from "@/components/chat/types"
import { useToast } from "@/hooks/use-toast"
import { requestJson, toJsonBody } from "@/lib/api/client"
import { withApiBase } from "@/lib/config/api-paths"

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
  const { toast } = useToast()

  const searchUsers = useCallback(async (query: string = "") => {
    setIsLoading(true)
    try {
      const { apiRoutes } = await import("@/lib/api/routes")
      const res = await requestJson<UserOption[]>(withApiBase(apiRoutes.adminUsers.search(query)))
      if (!res.ok) throw new Error(res.error || "Failed to search users")
      const data = Array.isArray(res.data) ? res.data : []
      const filtered = data.filter((u: UserOption) => u.id !== currentUser?.id)
      setUsers(filtered)
    } catch (error) {
      console.error("Error searching users:", error)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [currentUser?.id])

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
    if (value.length === 0 || value.length >= 2) {
      // Fire and forget
      void searchUsers(value)
    }
  }, [searchUsers])

  const toggleUser = (user: UserOption) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id)
      return exists ? prev.filter((u) => u.id !== user.id) : [...prev, user]
    })
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return

    setIsCreating(true)
    try {
      const { apiRoutes } = await import("@/lib/api/routes")
      const res = await requestJson(withApiBase(apiRoutes.adminGroups.create), {
        method: "POST",
        ...toJsonBody({
          name: groupName.trim(),
          description: groupDescription.trim() || undefined,
          memberIds: selectedUsers.map((u) => u.id),
        }),
      })
      if (!res.ok) {
        throw new Error(res.error || "Failed to create group")
      }
      type CreatedGroupPayload = {
        id: string
        name?: string
        description?: string | null
        avatar?: string | null
        createdById?: string
        createdAt?: string
        updatedAt?: string
        members?: Array<unknown>
        memberCount?: number
      }
      const created = (res.data ?? {}) as Partial<CreatedGroupPayload>

      if (!created.id) {
        throw new Error("Server không trả về ID của nhóm mới tạo")
      }

      const groupId = created.id

      // If server doesn't return full detail, construct minimal members and let UI refresh later
      const fallbackMembers: GroupMember[] = Array.isArray(created.members) && created.members.length
        ? (created.members as unknown as GroupMember[])
        : [
            // Current user as OWNER
            ...(currentUser?.id
              ? [
                  {
                    id: `temp-${groupId}-owner`,
                    groupId: groupId,
                    userId: currentUser.id,
                    role: "OWNER",
                    joinedAt: new Date(),
                    leftAt: null,
                    user: {
                      id: currentUser.id,
                      name: currentUser.name ?? null,
                      email: currentUser.email,
                      avatar: currentUser.image ?? null,
                    },
                  } as GroupMember,
                ]
              : []),
            // Selected users as MEMBER
            ...selectedUsers.map(
              (u): GroupMember => ({
                id: `temp-${groupId}-${u.id}`,
                groupId: groupId,
                userId: u.id,
                role: "MEMBER",
                joinedAt: new Date(),
                leftAt: null,
                user: { id: u.id, name: u.name, email: u.email, avatar: u.avatar },
              })
            ),
          ]

      // Construct minimal group and let UI refresh later
      const group: Group = {
        id: groupId,
        name: created.name ?? groupName.trim(),
        description: created.description ?? (groupDescription.trim() || undefined),
        avatar: created.avatar ?? null,
        createdById: created.createdById ?? currentUser?.id ?? "",
        createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
        updatedAt: created.updatedAt ? new Date(created.updatedAt) : new Date(),
        members: fallbackMembers,
        memberCount: created.memberCount ?? fallbackMembers.length,
      }

      onSelectGroup(group)

      toast({ title: "Thành công", description: res.message || "Đã tạo nhóm mới" })

      // Reset state
      setOpen(false)
      setGroupName("")
      setGroupDescription("")
      setSelectedUsers([])
      setUsers([])
      setSearchValue("")
    } catch (error) {
      console.error("Error creating group:", error)
      toast({ title: "Lỗi", description: error instanceof Error ? error.message : "Không thể tạo nhóm", variant: "destructive" })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setSearchValue(""); void searchUsers("") } }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Tạo nhóm mới</DialogTitle>
          <DialogDescription>Đặt tên, thêm mô tả và chọn thành viên</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">Tên nhóm</Label>
            <Input id="group-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-description">Mô tả</Label>
            <Textarea id="group-description" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Thêm thành viên</Label>
            <Command shouldFilter={false}>
              <CommandInput placeholder="Tìm kiếm theo tên hoặc email..." value={searchValue} onValueChange={handleSearchChange} />
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
                  <CommandGroup heading="Người dùng">
                    {users.map((user) => {
                      const selected = selectedUsers.some((u) => u.id === user.id)
                      return (
                        <CommandItem
                          key={user.id}
                          value={user.id}
                          onSelect={() => toggleUser(user)}
                          className={`flex items-center gap-3 cursor-pointer ${selected ? "bg-accent" : ""}`}
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
                          {selected && <span className="text-xs">Đã chọn</span>}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isCreating}>Hủy</Button>
            <Button onClick={handleCreateGroup} disabled={isCreating || !groupName.trim() || selectedUsers.length === 0}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo nhóm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
