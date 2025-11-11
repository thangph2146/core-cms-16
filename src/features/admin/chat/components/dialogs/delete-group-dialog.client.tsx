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
import { apiRoutes } from "@/lib/api/routes"
import { requestJson } from "@/lib/api/client"
import { withApiBase } from "@/lib/config/api-paths"
import { useToast } from "@/hooks/use-toast"
import { HardDeleteGroupDialog } from "./hard-delete-group-dialog.client"

interface DeleteGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group | null
  onSuccess?: () => void
}

export function DeleteGroupDialog({ open, onOpenChange, group, onSuccess }: DeleteGroupDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  const handleSoftDelete = async () => {
    if (!group) return

    setIsDeleting(true)
    try {
      const res = await requestJson(withApiBase(apiRoutes.adminGroups.delete(group.id)), { method: "DELETE" })
      if (!res.ok) throw new Error(res.error || "Failed to delete group")
      toast({ title: "Thành công", description: res.message || "Đã xóa nhóm (có thể khôi phục)" })

      onOpenChange(false)
      setTimeout(() => { onSuccess?.() }, 100)
    } catch (error) {
      console.error("Error deleting group:", error)
      toast({ title: "Lỗi", description: error instanceof Error ? error.message : "Đã xảy ra lỗi khi xóa nhóm", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleHardDeleteClick = () => {
    onOpenChange(false)
    setHardDeleteDialogOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Xóa nhóm
            </DialogTitle>
            <DialogDescription>
              Chọn cách xóa nhóm <strong>{group?.name}</strong>:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Button variant="secondary" onClick={handleSoftDelete} disabled={isDeleting} className="w-full justify-start">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
              Xóa mềm (có thể khôi phục)
            </Button>
            <Button variant="destructive" onClick={handleHardDeleteClick} className="w-full justify-start">
              Xóa vĩnh viễn
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>Hủy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HardDeleteGroupDialog
        open={hardDeleteDialogOpen}
        onOpenChange={setHardDeleteDialogOpen}
        group={group}
        onSuccess={onSuccess}
      />
    </>
  )
}
