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
import { Loader2, UserPlus, UserMinus, ShieldCheck } from "lucide-react"
import { logger } from "@/lib/config"
import type { Group, GroupRole } from "@/components/chat/types"
import { apiRoutes } from "@/lib/api/routes"
import { requestJson, toJsonBody } from "@/lib/api/client"
import { withApiBase } from "@/lib/config/api-paths"
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
      const response = await requestJson<UserOption[]>(withApiBase(apiRoutes.adminUsers.search(query)))
      if (!response.ok) throw new Error(response.error || "Failed to search users")
      const data = Array.isArray(response.data) ? response.data : []
      
      const existingMemberIds = group?.members.map((m) => m.userId) || []
      const filtered = data.filter(
        (u: UserOption) => u.id !== currentUser?.id && !existingMemberIds.includes(u.id)
      )
      setUsers(filtered)
    } catch (error) {
      logger.error("Error searching users", error as Error)
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
      const res = await requestJson(withApiBase(apiRoutes.adminGroups.addMembers(group.id)), {
        method: "POST",
        ...toJsonBody({ memberIds: [userId] }),
      })
      if (!res.ok) throw new Error(res.error || "Failed to add member")

      toast({ title: "Thành công", description: res.message || "Đã thêm thành viên vào nhóm" })

      onSuccess?.()
      setSearchValue("")
      setUsers([])
    } catch (error) {
      logger.error("Error adding member", error as Error)
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
      const res = await requestJson(withApiBase(apiRoutes.adminGroups.removeMember(group.id, memberId)), {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(res.error || "Failed to remove member")
      toast({ title: "Thành công", description: res.message || "Đã xóa thành viên khỏi nhóm" })

      onSuccess?.()
    } catch (error) {
      logger.error("Error removing member", error as Error)
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
      const res = await requestJson(withApiBase(apiRoutes.adminGroups.updateMemberRole(group.id, memberId)), {
        method: "PATCH",
        ...toJsonBody({ role: newRole }),
      })
      if (!res.ok) throw new Error(res.error || "Failed to update role")
      toast({ title: "Thành công", description: res.message || `Đã ${newRole === "ADMIN" ? "thăng cấp" : "hạ cấp"} thành viên` })

      onSuccess?.()
    } catch (error) {
      logger.error("Error updating role", error as Error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi khi cập nhật vai trò",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Thành viên nhóm</DialogTitle>
          <DialogDescription>Thêm, xóa hoặc cập nhật vai trò thành viên</DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="space-y-2">
            <Label>Tìm người dùng</Label>
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
                  <CommandGroup heading="Kết quả">
                    <ScrollArea className="h-[180px] pr-2">
                      {users.map((user) => (
                        <CommandItem key={user.id} value={user.id} className="flex items-center gap-3 cursor-pointer">
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
                          <Button size="sm" variant="secondary" disabled={isProcessing === user.id} onClick={() => handleAddMember(user.id)}>
                            {isProcessing === user.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="mr-2 h-4 w-4" />
                            )}
                            Thêm
                          </Button>
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>

          <div className="space-y-2">
            <Label>Thành viên hiện tại</Label>
            <div className="space-y-2">
              {group?.members?.length ? (
                <ScrollArea className="h-[240px] pr-2">
                  <div className="space-y-2">
                    {group?.members?.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 rounded border p-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user?.avatar || undefined} alt={member.user?.name || member.user?.email || ""} />
                          <AvatarFallback className="text-xs">
                            {(member.user?.name || member.user?.email || "").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{member.user?.name || member.user?.email}</span>
                          <span className="text-xs text-muted-foreground truncate">{member.role}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {canPromoteAdmin && (
                            <Button size="sm" variant="secondary" disabled={isProcessing === member.id} onClick={() => handleUpdateRole(member.userId, member.role === "ADMIN" ? "MEMBER" : "ADMIN")}>
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              {member.role === "ADMIN" ? "Hạ cấp" : "Thăng cấp"}
                            </Button>
                          )}
                          {canManageMembers && (
                            <Button size="sm" variant="destructive" disabled={isProcessing === member.id} onClick={() => handleRemoveMember(member.userId)}>
                              {isProcessing === member.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <UserMinus className="mr-2 h-4 w-4" />
                              )}
                              Xóa
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-sm text-muted-foreground">Chưa có thành viên nào</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
