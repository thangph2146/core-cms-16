/**
 * Custom hook để xử lý các actions của groups
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

"use client"

import { useCallback, useState } from "react"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import type { Group } from "@/components/chat/types"
import type { FeedbackVariant } from "@/components/dialogs"
import { GROUP_MESSAGES } from "../constants/messages"
import { logger } from "@/lib/config"

interface UseGroupActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  isSocketConnected: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
  onSuccess?: () => void
}

export function useGroupDialogActions({
  canDelete,
  canRestore,
  canManage,
  isSocketConnected,
  showFeedback,
  onSuccess,
}: UseGroupActionsOptions) {
  const [deletingGroups, setDeletingGroups] = useState<Set<string>>(new Set())
  const [restoringGroups, setRestoringGroups] = useState<Set<string>>(new Set())
  const [hardDeletingGroups, setHardDeletingGroups] = useState<Set<string>>(new Set())

  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      group: Group,
      refresh?: () => void
    ): Promise<void> => {
      const actionConfig = {
        delete: {
          permission: canDelete,
          endpoint: apiRoutes.adminGroups.delete(group.id),
          method: "delete" as const,
          successTitle: GROUP_MESSAGES.DELETE_SUCCESS,
          successDescription: `Đã xóa nhóm "${group.name}"`,
          errorTitle: GROUP_MESSAGES.DELETE_ERROR,
          errorDescription: `Không thể xóa nhóm "${group.name}"`,
          setLoadingState: setDeletingGroups,
        },
        restore: {
          permission: canRestore,
          endpoint: apiRoutes.adminGroups.restore(group.id),
          method: "post" as const,
          successTitle: GROUP_MESSAGES.RESTORE_SUCCESS,
          successDescription: `Đã khôi phục nhóm "${group.name}"`,
          errorTitle: GROUP_MESSAGES.RESTORE_ERROR,
          errorDescription: `Không thể khôi phục nhóm "${group.name}"`,
          setLoadingState: setRestoringGroups,
        },
        "hard-delete": {
          permission: canManage,
          endpoint: apiRoutes.adminGroups.hardDelete(group.id),
          method: "delete" as const,
          successTitle: GROUP_MESSAGES.HARD_DELETE_SUCCESS,
          successDescription: `Đã xóa vĩnh viễn nhóm "${group.name}"`,
          errorTitle: GROUP_MESSAGES.HARD_DELETE_ERROR,
          errorDescription: `Không thể xóa vĩnh viễn nhóm "${group.name}"`,
          setLoadingState: setHardDeletingGroups,
        },
      }[action]

      if (!actionConfig.permission) {
        showFeedback("error", GROUP_MESSAGES.NO_PERMISSION, action === "delete" ? GROUP_MESSAGES.NO_DELETE_PERMISSION : action === "restore" ? GROUP_MESSAGES.NO_RESTORE_PERMISSION : GROUP_MESSAGES.NO_PERMISSION)
        return
      }

      actionConfig.setLoadingState((prev) => new Set(prev).add(group.id))

      try {
        if (actionConfig.method === "delete") {
          await apiClient.delete(actionConfig.endpoint)
        } else if (actionConfig.method === "post") {
          await apiClient.post(actionConfig.endpoint)
        }
        showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)
        if (!isSocketConnected && refresh) {
          refresh()
        }
        onSuccess?.()
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : GROUP_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          logger.error(`Failed to ${action} group`, error as Error)
        } else {
          throw error
        }
      } finally {
        actionConfig.setLoadingState((prev) => {
          const next = new Set(prev)
          next.delete(group.id)
          return next
        })
      }
    },
    [canDelete, canRestore, canManage, isSocketConnected, showFeedback, onSuccess],
  )

  return {
    executeSingleAction,
    deletingGroups,
    restoringGroups,
    hardDeletingGroups,
  }
}

