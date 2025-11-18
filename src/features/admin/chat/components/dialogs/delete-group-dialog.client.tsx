"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, AlertTriangle, Trash } from "lucide-react"
import type { Group } from "@/components/chat/types"
import { HardDeleteGroupDialog } from "./hard-delete-group-dialog.client"
import { useGroupDeleteConfirm } from "../../hooks/use-group-delete-confirm"
import { useGroupDialogActions } from "../../hooks/use-group-dialog-actions"
import { useGroupFeedback } from "../../hooks/use-group-feedback"
import { GROUP_CONFIRM_MESSAGES, GROUP_LABELS } from "../../constants"
import { useChatSocketBridge } from "../../hooks/use-chat-socket-bridge"
import { FeedbackDialog } from "@/components/dialogs"

interface DeleteGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group | null
  onSuccess?: () => void
  currentUserId: string
  role?: string | null
  setContactsState: React.Dispatch<React.SetStateAction<any[]>>
}

export function DeleteGroupDialog({ 
  open, 
  onOpenChange, 
  group, 
  onSuccess,
  currentUserId,
  role,
  setContactsState,
}: DeleteGroupDialogProps) {
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false)
  const { socket } = useChatSocketBridge({
    currentUserId,
    role,
    setContactsState,
  })
  const { feedback, showFeedback, handleFeedbackOpenChange } = useGroupFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = useGroupDeleteConfirm()
  const { executeSingleAction, deletingGroups } = useGroupDialogActions({
    canDelete: true,
    canRestore: false,
    canManage: true,
    isSocketConnected: socket?.connected ?? false,
    showFeedback,
    onSuccess,
  })

  const handleSoftDelete = async () => {
    if (!group) return

    setDeleteConfirm({
      open: true,
      type: "soft",
      group,
      onConfirm: async () => {
        await executeSingleAction("delete", group)
        onOpenChange(false)
      },
    })
  }

  const handleHardDeleteClick = () => {
    onOpenChange(false)
    setHardDeleteDialogOpen(true)
  }

  const isDeleting = group ? deletingGroups.has(group.id) : false

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {GROUP_CONFIRM_MESSAGES.DELETE_TITLE(group?.name)}
            </DialogTitle>
            <DialogDescription>
              {GROUP_CONFIRM_MESSAGES.DELETE_DESCRIPTION(group?.name)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Button 
              variant="secondary" 
              onClick={handleSoftDelete} 
              disabled={isDeleting} 
              className="w-full justify-start"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash className="mr-2 h-4 w-4" />
              )}
              {GROUP_LABELS.SOFT_DELETE}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleHardDeleteClick} 
              disabled={isDeleting}
              className="w-full justify-start"
            >
              {GROUP_LABELS.HARD_DELETE}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
              {GROUP_CONFIRM_MESSAGES.CANCEL_LABEL}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Dialog open={deleteConfirm.open} onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null)
        }}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {GROUP_CONFIRM_MESSAGES.DELETE_TITLE(deleteConfirm.group?.name)}
              </DialogTitle>
              <DialogDescription>
                {GROUP_CONFIRM_MESSAGES.DELETE_DESCRIPTION(deleteConfirm.group?.name)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
                {GROUP_CONFIRM_MESSAGES.CANCEL_LABEL}
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {GROUP_CONFIRM_MESSAGES.CONFIRM_LABEL}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <HardDeleteGroupDialog
        open={hardDeleteDialogOpen}
        onOpenChange={setHardDeleteDialogOpen}
        group={group}
        onSuccess={onSuccess}
        currentUserId={currentUserId}
        role={role}
        setContactsState={setContactsState}
      />

      {/* Feedback Dialog */}
      {feedback && (
        <FeedbackDialog
          open={feedback.open}
          onOpenChange={handleFeedbackOpenChange}
          variant={feedback.variant}
          title={feedback.title}
          description={feedback.description}
          details={feedback.details}
        />
      )}
    </>
  )
}
