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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Loader2, UserPlus, UserMinus, ShieldCheck, User } from "lucide-react"
import type { Group, GroupRole } from "@/components/chat/types"
import { apiRoutes } from "@/lib/api/routes"
import { useToast } from "@/hooks/use-toast"

interface UserOption {
  id: string
  name: string | null
  email: string
  avatar: string | null
}

interface ManageMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group | null
  currentUserRole?: GroupRole
  onSuccess?: () => void
}

export function ManageMembersDialog({
  open,
  onOpenChange,
  group,
  currentUserRole,
  onSuccess,
}: ManageMembersDialogProps) {
  const [searchValue, setSearchValue] = useState("")
  const [users, setUsers] = useState<UserOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const canManageMembers = currentUserRole === "OWNER" || currentUserRole === "ADMIN"
  const canPromoteAdmin = currentUserRole === "OWNER"

  const searchUsers = useCallback(async (query: string = "") => {
    setIsLoading(true)
    try {
      const { apiRoutes } = await import("@/lib/api/routes")
      const response = await fetch(`/api${apiRoutes.adminUsers.search(query)}`)
      if (!response.ok) throw new Error("Failed to search users")
      const data = await response.json()
      
      // Filter out current user and existing members
      const existingMemberIds = group?.members.map((m) => m.userId) || []
      const filtered = data.filter(
        (u: UserOption) => u.id !== currentUser?.id && !existingMemberIds.includes(u.id)
      )
      setUsers(filtered)
    } catch (error) {
      console.error("Error searching users:", error)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [currentUser?.id, group?.members])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value)
      if (value.length === 0 || value.length >= 2) {
        searchUsers(value)
      }
    },
    [searchUsers]
  )

  const handleAddMember = async (userId: string) => {
    if (!group) return

    setIsProcessing(userId)
    try {
      const response = await fetch(`/api${apiRoutes.adminGroups.addMembers(group.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: [userId] }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to add member" }))
        throw new Error(errorData.error || "Failed to add member")
      }

      toast({
        title: "Thành công",
        description: "Đã thêm thành viên vào nhóm",
      })

      onSuccess?.()
      setSearchValue("")
      setUsers([])
    } catch (error) {
      console.error("Error adding member:", error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi khi thêm thành viên",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(null)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!group) return

    setIsProcessing(memberId)
    try {
      const response = await fetch(
        `/api${apiRoutes.adminGroups.removeMember(group.id, memberId)}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to remove member" }))
        throw new Error(errorData.error || "Failed to remove member")
      }

      toast({
        title: "Thành công",
        description: "Đã xóa thành viên khỏi nhóm",
      })

      onSuccess?.()
    } catch (error) {
      console.error("Error removing member:", error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi khi xóa thành viên",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(null)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: "ADMIN" | "MEMBER") => {
    if (!group) return

    setIsProcessing(memberId)
    try {
      const response = await fetch(
        `/api${apiRoutes.adminGroups.updateMemberRole(group.id, memberId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update role" }))
        throw new Error(errorData.error || "Failed to update role")
      }

      toast({
        title: "Thành công",
        description: `Đã ${newRole === "ADMIN" ? "thăng cấp" : "hạ cấp"} thành viên`,
      })

      onSuccess?.()
    } catch (error) {
      console.error("Error updating role:", error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi khi cập nhật vai trò",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(null)
    }
  }

  useEffect(() => {
    if (open) {
      setSearchValue("")
      searchUsers("")
    } else {
      setUsers([])
      setSearchValue("")
    }
  }, [open, searchUsers])

  if (!group) return null

  const currentMembers = group.members.filter((m) => !m.leftAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {canManageMembers ? "Quản lý thành viên" : "Thành viên nhóm"}
          </DialogTitle>
          <DialogDescription>
            {canManageMembers
              ? "Thêm, xóa thành viên và quản lý vai trò"
              : "Danh sách thành viên trong nhóm"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Add Members Section */}
          {canManageMembers && (
            <div className="space-y-2">
              <Label>Thêm thành viên</Label>
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
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.id}
                          onSelect={() => handleAddMember(user.id)}
                          className="flex items-center gap-3 cursor-pointer"
                          disabled={isProcessing === user.id}
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
                          {isProcessing === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </div>
          )}

          {/* Current Members List */}
          <div className="space-y-2">
            <Label>Thành viên hiện tại ({currentMembers.length})</Label>
            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-2">
                {currentMembers.map((member) => {
                  const memberUser = member.user
                  if (!memberUser) return null

                  const isCurrentUser = member.userId === currentUser?.id
                  const canRemove = canManageMembers && !isCurrentUser && member.role !== "OWNER"
                  const canChangeRole = canPromoteAdmin && !isCurrentUser && member.role !== "OWNER"

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={memberUser.avatar || undefined} alt={memberUser.name || memberUser.email} />
                        <AvatarFallback className="text-xs">
                          {(memberUser.name || memberUser.email).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {memberUser.name || memberUser.email}
                          </span>
                          {member.role === "OWNER" && (
                            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                              Chủ nhóm
                            </span>
                          )}
                          {member.role === "ADMIN" && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full">
                              Quản trị viên
                            </span>
                          )}
                        </div>
                        {memberUser.name && (
                          <span className="text-xs text-muted-foreground truncate">{memberUser.email}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {canChangeRole && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleUpdateRole(member.userId, member.role === "ADMIN" ? "MEMBER" : "ADMIN")
                            }
                            disabled={isProcessing === member.id}
                            title={member.role === "ADMIN" ? "Hạ cấp thành viên" : "Thăng cấp quản trị viên"}
                          >
                            {isProcessing === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : member.role === "ADMIN" ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={isProcessing === member.id}
                            title="Xóa thành viên"
                          >
                            {isProcessing === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

