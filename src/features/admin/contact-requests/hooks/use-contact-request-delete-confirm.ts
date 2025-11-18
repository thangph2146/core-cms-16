/**
 * Custom hook để quản lý delete confirmation dialogs
 */

import { useCallback, useState } from "react"
import type { ContactRequestRow } from "../types"

interface DeleteConfirmState {
  open: boolean
  type: "soft" | "hard"
  row?: ContactRequestRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

export function useContactRequestDeleteConfirm() {
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

