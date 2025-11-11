/**
 * Hook để handle group actions (hard delete, refresh)
 * Tách logic để code ngắn gọn và dễ test
 */

import { useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import type { Contact } from "@/components/chat/types"
import { refreshGroupData, updateContactWithGroupData } from "../components/chat-template-helpers"

interface UseGroupActionsProps {
  currentChat: Contact | null
  setCurrentChat: (contact: Contact | null) => void
  setContactsState: React.Dispatch<React.SetStateAction<Contact[]>>
  onHardDeleteSuccess?: () => void // Callback after hard delete success
}

export function useGroupActions({
  currentChat,
  setCurrentChat,
  setContactsState,
  onHardDeleteSuccess,
}: UseGroupActionsProps) {
  const { toast } = useToast()

  const handleGroupUpdated = useCallback(async () => {
    if (!currentChat || currentChat.type !== "GROUP") return

    try {
      const groupData = await refreshGroupData(currentChat.id)

      if (!groupData) {
        toast({
          variant: "destructive",
          title: "Không thể tải nhóm",
          description: "Vui lòng thử lại hoặc tải lại trang.",
        })
        return
      }

      setContactsState((prev) => updateContactWithGroupData(prev, currentChat.id, groupData))
    } catch (error) {
      console.error("Failed to refresh group data", error)
      toast({
        variant: "destructive",
        title: "Lỗi cập nhật nhóm",
        description: "Không thể cập nhật thông tin nhóm. Vui lòng thử lại sau.",
      })
    }
  }, [currentChat, setContactsState, toast])

  const handleHardDeleteGroup = useCallback(async () => {
    // This function is called after successful hard delete from dialog
    // Just handle cleanup and state updates
    if (!currentChat || currentChat.type !== "GROUP") return
    
    setCurrentChat(null)
    // Refresh deleted groups list if callback provided (when on DELETED filter)
    // Wait a bit for socket event to process first
    if (onHardDeleteSuccess) {
      setTimeout(() => {
        onHardDeleteSuccess()
      }, 500) // Wait 500ms for socket event to remove group from state
    }
  }, [currentChat, setCurrentChat, onHardDeleteSuccess])

  return {
    handleGroupUpdated,
    handleHardDeleteGroup,
  }
}
