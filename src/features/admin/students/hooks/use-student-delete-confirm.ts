import { useCallback, useState } from "react"
import type { StudentRow } from "../types"

interface DeleteConfirmState {
  open: boolean
  type: "soft" | "hard" | "restore"
  row?: StudentRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

export function useStudentDeleteConfirm() {
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

