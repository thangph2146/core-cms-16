"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, Edit, Users, Trash2 } from "lucide-react"
import type { Group, GroupRole } from "@/components/chat/types"
import { EditGroupDialog } from "./edit-group-dialog"
import { ManageMembersDialog } from "./dialogs/manage-members-dialog"
import { DeleteGroupDialog } from "./dialogs/delete-group-dialog"

interface GroupManagementMenuProps {
  group: Group | null
  currentUserRole?: GroupRole
  onGroupUpdated?: () => void
}

export function GroupManagementMenu({
  group,
  currentUserRole,
  onGroupUpdated,
}: GroupManagementMenuProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const canEdit = currentUserRole === "OWNER" || currentUserRole === "ADMIN"
  const canManageMembers = currentUserRole === "OWNER" || currentUserRole === "ADMIN"
  const canViewMembers = true // Tất cả thành viên đều có thể xem danh sách
  const canDelete = currentUserRole === "OWNER"

  if (!group || !currentUserRole) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Chỉnh sửa nhóm
            </DropdownMenuItem>
          )}
          {canManageMembers ? (
            <DropdownMenuItem onClick={() => setMembersDialogOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              Quản lý thành viên
            </DropdownMenuItem>
          ) : canViewMembers ? (
            <DropdownMenuItem onClick={() => setMembersDialogOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              Xem thành viên
            </DropdownMenuItem>
          ) : null}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa nhóm
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditGroupDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        group={group}
        onSuccess={onGroupUpdated}
      />

      <ManageMembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        group={group}
        currentUserRole={currentUserRole}
        onSuccess={onGroupUpdated}
      />

      <DeleteGroupDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        group={group}
        onSuccess={() => {
          onGroupUpdated?.()
          // Group sẽ được xóa khỏi contactsState qua socket event
          // Nhưng cần đảm bảo currentChat được clear nếu đang chat group đó
        }}
      />
    </>
  )
}

