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
  onHardDeleteSuccess?: () => void // Callback after hard delete success
}

export function useGroupActions({
  currentChat,
  currentUserRole,
  setCurrentChat,
  setContactsState,
  onHardDeleteSuccess,
}: UseGroupActionsProps) {
  const { toast } = useToast()

  const handleGroupUpdated = useCallback(async () => {
    if (!currentChat || currentChat.type !== "GROUP") return

    const groupData = await refreshGroupData(currentChat.id)
    if (!groupData) return

    setContactsState((prev) => updateContactWithGroupData(prev, currentChat.id, groupData))
  }, [currentChat, setContactsState])

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

