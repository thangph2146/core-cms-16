"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, AlertTriangle } from "lucide-react"
import type { Group } from "@/components/chat/types"
import { useGroupDeleteConfirm } from "../../hooks/use-group-delete-confirm"
import { useGroupDialogActions } from "../../hooks/use-group-dialog-actions"
import { useGroupFeedback } from "../../hooks/use-group-feedback"
import { GROUP_CONFIRM_MESSAGES, GROUP_LABELS } from "../../constants"
import { useChatSocketBridge } from "../../hooks/use-chat-socket-bridge"
import { FeedbackDialog } from "@/components/dialogs"

interface HardDeleteGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group | null
  onSuccess?: () => void
  currentUserId: string
  role?: string | null
  setContactsState: React.Dispatch<React.SetStateAction<any[]>>
}

export function HardDeleteGroupDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
  currentUserId,
  role,
  setContactsState,
}: HardDeleteGroupDialogProps) {
  const { socket } = useChatSocketBridge({
    currentUserId,
    role,
    setContactsState,
  })
  const { feedback, showFeedback, handleFeedbackOpenChange } = useGroupFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = useGroupDeleteConfirm()
  const { executeSingleAction, hardDeletingGroups } = useGroupDialogActions({
    canDelete: false,
    canRestore: false,
    canManage: true,
    isSocketConnected: socket?.connected ?? false,
    showFeedback,
    onSuccess: () => {
      onOpenChange(false)
      onSuccess?.()
    },
  })

  const handleConfirm = async () => {
    if (!group) return

    setDeleteConfirm({
      open: true,
      type: "hard",
      group,
      onConfirm: async () => {
        await executeSingleAction("hard-delete", group)
      },
    })
  }

  const isDeleting = group ? hardDeletingGroups.has(group.id) : false

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {GROUP_CONFIRM_MESSAGES.HARD_DELETE_TITLE(group?.name)}
            </DialogTitle>
            <DialogDescription>
              {GROUP_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(group?.name)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {GROUP_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(group?.name)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
              {GROUP_CONFIRM_MESSAGES.CANCEL_LABEL}
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {GROUP_CONFIRM_MESSAGES.HARD_DELETE_LABEL}
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
                {GROUP_CONFIRM_MESSAGES.HARD_DELETE_TITLE(deleteConfirm.group?.name)}
              </DialogTitle>
              <DialogDescription>
                {GROUP_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(deleteConfirm.group?.name)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
                {GROUP_CONFIRM_MESSAGES.CANCEL_LABEL}
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {GROUP_CONFIRM_MESSAGES.HARD_DELETE_LABEL}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
