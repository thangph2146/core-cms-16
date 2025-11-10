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
import { Loader2, AlertTriangle, Trash2, Trash } from "lucide-react"
import type { Group } from "@/components/chat/types"
import { apiRoutes } from "@/lib/api/routes"
import { useToast } from "@/hooks/use-toast"

interface DeleteGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group | null
  onSuccess?: () => void
}

export function DeleteGroupDialog({ open, onOpenChange, group, onSuccess }: DeleteGroupDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteType, setDeleteType] = useState<"soft" | "hard" | null>(null)
  const { toast } = useToast()

  const handleDelete = async (type: "soft" | "hard") => {
    if (!group) return

    setIsDeleting(true)
    setDeleteType(type)
    try {
      const url = type === "hard" 
        ? `/api${apiRoutes.adminGroups.hardDelete(group.id)}`
        : `/api${apiRoutes.adminGroups.delete(group.id)}`
      
      const response = await fetch(url, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete group" }))
        throw new Error(errorData.error || "Failed to delete group")
      }

      toast({
        title: "Thành công",
        description: type === "hard" ? "Đã xóa vĩnh viễn nhóm" : "Đã xóa nhóm (có thể khôi phục)",
      })

      onOpenChange(false)
      // Delay onSuccess để đảm bảo dialog đã đóng
      setTimeout(() => {
        onSuccess?.()
      }, 100)
    } catch (error) {
      console.error("Error deleting group:", error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi khi xóa nhóm",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteType(null)
    }
  }

  return (
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
        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleDelete("soft")}
            disabled={isDeleting}
          >
            <Trash className="mr-2 h-4 w-4" />
            <div className="flex-1 text-left">
              <div className="font-medium">Xóa tạm thời</div>
            </div>
            {isDeleting && deleteType === "soft" && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            )}
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={() => handleDelete("hard")}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <div className="flex-1 text-left">
              <div className="font-medium">Xóa vĩnh viễn</div>
            </div>
            {isDeleting && deleteType === "hard" && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            )}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Hủy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

