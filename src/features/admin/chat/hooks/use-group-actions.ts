/**
 * Hook để handle group actions (hard delete, refresh)
 * Tách logic để code ngắn gọn và dễ test
 */

import { useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { apiRoutes } from "@/lib/api/routes"
import type { Contact, GroupRole } from "@/components/chat/types"
import { refreshGroupData, updateContactWithGroupData } from "../components/chat-template-helpers"

interface UseGroupActionsProps {
  currentChat: Contact | null
  currentUserRole?: GroupRole
  setCurrentChat: (contact: Contact | null) => void
  setContactsState: React.Dispatch<React.SetStateAction<Contact[]>>
}

export function useGroupActions({
  currentChat,
  currentUserRole,
  setCurrentChat,
  setContactsState,
}: UseGroupActionsProps) {
  const { toast } = useToast()

  const handleGroupUpdated = useCallback(async () => {
    if (!currentChat || currentChat.type !== "GROUP") return

    const groupData = await refreshGroupData(currentChat.id)
    if (!groupData) return

    setContactsState((prev) => updateContactWithGroupData(prev, currentChat.id, groupData))
  }, [currentChat, setContactsState])

  const handleHardDeleteGroup = useCallback(async () => {
    if (!currentChat || currentChat.type !== "GROUP" || !currentChat.group) return
    if (currentUserRole !== "OWNER" && currentUserRole !== "ADMIN") return

    if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn nhóm này? Hành động này không thể hoàn tác.")) {
      return
    }

    try {
      const response = await fetch(`/api${apiRoutes.adminGroups.hardDelete(currentChat.id)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to hard delete group" }))
        throw new Error(errorData.error || "Failed to hard delete group")
      }

      toast({
        title: "Thành công",
        description: "Đã xóa vĩnh viễn nhóm",
      })

      setCurrentChat(null)
      handleGroupUpdated()
    } catch (error) {
      console.error("Error hard deleting group:", error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi khi xóa vĩnh viễn nhóm",
        variant: "destructive",
      })
    }
  }, [currentChat, currentUserRole, toast, setCurrentChat, handleGroupUpdated])

  return {
    handleGroupUpdated,
    handleHardDeleteGroup,
  }
}

