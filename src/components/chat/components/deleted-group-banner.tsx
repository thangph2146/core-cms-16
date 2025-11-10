/**
 * Banner hiển thị khi group đã bị xóa
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { GroupRole, Group } from "../types"
import { HardDeleteGroupDialog } from "@/features/admin/chat/components/dialogs/hard-delete-group-dialog"

interface DeletedGroupBannerProps {
  currentUserRole?: GroupRole
  group?: Group | null
  onHardDeleteGroup?: () => void
}

export function DeletedGroupBanner({
  currentUserRole,
  group,
  onHardDeleteGroup,
}: DeletedGroupBannerProps) {
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false)
  const canHardDelete = currentUserRole === "OWNER" && onHardDeleteGroup

  const handleHardDeleteClick = () => {
    setHardDeleteDialogOpen(true)
  }

  const handleHardDeleteSuccess = () => {
    onHardDeleteGroup?.()
  }

  return (
    <>
      <div className="flex items-center justify-between py-4 px-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-2">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="font-medium">Nhóm này đã bị xóa</span>
        </div>
        {canHardDelete && (
          <Button variant="destructive" size="sm" onClick={handleHardDeleteClick} className="h-7 text-xs">
            <Trash2 className="mr-1 h-3 w-3" />
            Xóa vĩnh viễn
          </Button>
        )}
      </div>

      <HardDeleteGroupDialog
        open={hardDeleteDialogOpen}
        onOpenChange={setHardDeleteDialogOpen}
        group={group || null}
        onSuccess={handleHardDeleteSuccess}
      />
    </>
  )
}

