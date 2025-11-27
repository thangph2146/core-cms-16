import { useCallback, useState } from "react"
import type { NotificationRow } from "../types"

interface DeleteConfirmState {
  open: boolean
  type: "delete" | "mark-read" | "mark-unread"
  row?: NotificationRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

export function useNotificationDeleteConfirm() {
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return
    await deleteConfirm.onConfirm()
    setDeleteConfirm(null)
  }, [deleteConfirm])

  return {
    deleteConfirm,
    setDeleteConfirm,
    handleDeleteConfirm,
  }
}

