"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { logger } from "@/lib/config"
import type { Group } from "@/components/chat/types"
import { apiRoutes } from "@/lib/api/routes"
import { useToast } from "@/hooks/use-toast"
import { withApiBase } from "@/lib/config/api-paths"
import { requestJson, toJsonBody } from "@/lib/api/client"

interface EditGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group | null
  onSuccess?: () => void
}

export function EditGroupDialog({ open, onOpenChange, group, onSuccess }: EditGroupDialogProps) {
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (group) {
      setGroupName(group.name)
      setGroupDescription(group.description || "")
    }
  }, [group])

  const handleSave = async () => {
    if (!group || !groupName.trim()) return

    setIsSaving(true)
    try {
      const response = await requestJson(withApiBase(apiRoutes.adminGroups.update(group.id)), {
        method: "PUT",
        ...toJsonBody({
          name: groupName.trim(),
          description: groupDescription.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(response.error || "Failed to update group")
      }

      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin nhóm",
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      logger.error("Error updating group", error as Error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi khi cập nhật nhóm",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa nhóm</DialogTitle>
          <DialogDescription>Cập nhật tên và mô tả cho nhóm</DialogDescription>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
