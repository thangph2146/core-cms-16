"use client"

import { useCallback, useState } from "react"
import type { Group } from "@/components/chat/types"

interface DeleteConfirmState {
  open: boolean
  type: "soft" | "hard" | "restore"
  group?: Group
  onConfirm: () => Promise<void>
}

export function useGroupDeleteConfirm() {
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

