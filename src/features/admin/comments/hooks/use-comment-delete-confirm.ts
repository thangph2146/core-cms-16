import { useCallback, useState } from "react"
import type { CommentRow } from "../types"

interface DeleteConfirmState {
  open: boolean
  type: "soft" | "hard" | "restore" | "approve" | "unapprove"
  row?: CommentRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

export function useCommentDeleteConfirm() {
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return
    try {
      await deleteConfirm.onConfirm()
    } catch {
      // Error already handled in onConfirm
    } finally {
      setDeleteConfirm(null)
    }
  }, [deleteConfirm])

  return {
    deleteConfirm,
    setDeleteConfirm,
    handleDeleteConfirm,
  }
}

