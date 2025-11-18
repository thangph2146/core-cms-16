/**
 * Row actions utilities cho comments table
 */

import { useCallback } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle, Eye, Check, X, Loader2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CommentRow } from "../types"
import { COMMENT_LABELS } from "../constants"

export interface RowActionConfig {
  label: string
  icon: LucideIcon
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  isLoading?: boolean
  loadingLabel?: string
}

interface UseRowActionsOptions {
  canApprove: boolean
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  onToggleApprove: (row: CommentRow, checked: boolean) => void
  onDelete: (row: CommentRow) => void
  onHardDelete: (row: CommentRow) => void
  onRestore: (row: CommentRow) => void
  approvingComments?: Set<string>
  unapprovingComments?: Set<string>
  deletingComments?: Set<string>
  restoringComments?: Set<string>
  hardDeletingComments?: Set<string>
}

export function renderRowActions(actions: RowActionConfig[]) {
  if (actions.length === 0) {
    return null
  }

  if (actions.length === 1) {
    const singleAction = actions[0]
    const Icon = singleAction.isLoading ? Loader2 : singleAction.icon
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={singleAction.disabled || singleAction.isLoading}
        onClick={() => {
          if (singleAction.disabled || singleAction.isLoading) return
          singleAction.onSelect()
        }}
      >
        <Icon className={`mr-2 h-5 w-5 ${singleAction.isLoading ? "animate-spin" : ""}`} />
        {singleAction.isLoading ? singleAction.loadingLabel || singleAction.label : singleAction.label}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => {
          const Icon = action.isLoading ? Loader2 : action.icon
          return (
            <DropdownMenuItem
              key={action.label}
              disabled={action.disabled || action.isLoading}
              onClick={() => {
                if (action.disabled || action.isLoading) return
                action.onSelect()
              }}
              className={
                action.destructive
                  ? "text-destructive focus:text-destructive disabled:opacity-50"
                  : "disabled:opacity-50"
              }
            >
              <Icon
                className={
                  action.destructive
                    ? `mr-2 h-5 w-5 text-destructive ${action.isLoading ? "animate-spin" : ""}`
                    : `mr-2 h-5 w-5 ${action.isLoading ? "animate-spin" : ""}`
                }
              />
              {action.isLoading ? action.loadingLabel || action.label : action.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function useCommentRowActions({
  canApprove,
  canDelete,
  canRestore,
  canManage,
  onToggleApprove,
  onDelete,
  onHardDelete,
  onRestore,
  approvingComments = new Set(),
  unapprovingComments = new Set(),
  deletingComments = new Set(),
  restoringComments = new Set(),
  hardDeletingComments = new Set(),
}: UseRowActionsOptions) {
  const router = useResourceRouter()

  const renderActiveRowActions = useCallback(
    (row: CommentRow) => {
      const actions: RowActionConfig[] = [
        {
          label: COMMENT_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => router.push(`/admin/comments/${row.id}`),
        },
      ]

      if (canApprove) {
        if (row.approved) {
          const isUnapproving = unapprovingComments.has(row.id)
          actions.push({
            label: COMMENT_LABELS.UNAPPROVE,
            icon: X,
            onSelect: () => onToggleApprove(row, false),
            disabled: isUnapproving || approvingComments.has(row.id) || deletingComments.has(row.id) || restoringComments.has(row.id) || hardDeletingComments.has(row.id),
            isLoading: isUnapproving,
            loadingLabel: COMMENT_LABELS.UNAPPROVING,
          })
        } else {
          const isApproving = approvingComments.has(row.id)
          actions.push({
            label: COMMENT_LABELS.APPROVE,
            icon: Check,
            onSelect: () => onToggleApprove(row, true),
            disabled: isApproving || unapprovingComments.has(row.id) || deletingComments.has(row.id) || restoringComments.has(row.id) || hardDeletingComments.has(row.id),
            isLoading: isApproving,
            loadingLabel: COMMENT_LABELS.APPROVING,
          })
        }
      }

      if (canDelete) {
        const isDeleting = deletingComments.has(row.id)
        actions.push({
          label: COMMENT_LABELS.DELETE,
          icon: Trash2,
          onSelect: () => onDelete(row),
          destructive: true,
          disabled: isDeleting || restoringComments.has(row.id) || hardDeletingComments.has(row.id),
          isLoading: isDeleting,
          loadingLabel: COMMENT_LABELS.DELETING,
        })
      }

      if (canManage) {
        const isHardDeleting = hardDeletingComments.has(row.id)
        actions.push({
          label: COMMENT_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
          disabled: deletingComments.has(row.id) || restoringComments.has(row.id) || isHardDeleting,
          isLoading: isHardDeleting,
          loadingLabel: COMMENT_LABELS.HARD_DELETING,
        })
      }

      return renderRowActions(actions)
    },
    [canApprove, canDelete, canManage, onToggleApprove, onDelete, onHardDelete, router, approvingComments, unapprovingComments, deletingComments, restoringComments, hardDeletingComments],
  )

  const renderDeletedRowActions = useCallback(
    (row: CommentRow) => {
      const actions: RowActionConfig[] = [
        {
          label: COMMENT_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => router.push(`/admin/comments/${row.id}`),
        },
      ]

      if (canRestore) {
        const isRestoring = restoringComments.has(row.id)
        actions.push({
          label: COMMENT_LABELS.RESTORE,
          icon: RotateCcw,
          onSelect: () => onRestore(row),
          disabled: deletingComments.has(row.id) || isRestoring || hardDeletingComments.has(row.id),
          isLoading: isRestoring,
          loadingLabel: COMMENT_LABELS.RESTORING,
        })
      }

      if (canManage) {
        const isHardDeleting = hardDeletingComments.has(row.id)
        actions.push({
          label: COMMENT_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
          disabled: deletingComments.has(row.id) || restoringComments.has(row.id) || isHardDeleting,
          isLoading: isHardDeleting,
          loadingLabel: COMMENT_LABELS.HARD_DELETING,
        })
      }

      return renderRowActions(actions)
    },
    [canManage, canRestore, onHardDelete, onRestore, router, deletingComments, restoringComments, hardDeletingComments],
  )

  return {
    renderActiveRowActions,
    renderDeletedRowActions,
  }
}

