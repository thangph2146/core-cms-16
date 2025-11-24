/**
 * Row actions utilities cho posts table
 */

import { useCallback } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle, Eye, Pencil, Loader2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PostRow } from "../types"
import { POST_LABELS } from "../constants/messages"

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
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  onDelete: (row: PostRow) => void
  onHardDelete: (row: PostRow) => void
  onRestore: (row: PostRow) => void
  deletingIds?: Set<string>
  restoringIds?: Set<string>
  hardDeletingIds?: Set<string>
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
                  ? "text-destructive focus:text-destructive data-[highlighted]:text-destructive data-[highlighted]:bg-destructive/10 disabled:opacity-50"
                  : "data-[highlighted]:bg-accent/10 disabled:opacity-50"
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

export function usePostRowActions({
  canDelete,
  canRestore,
  canManage,
  onDelete,
  onHardDelete,
  onRestore,
  deletingIds = new Set(),
  restoringIds = new Set(),
  hardDeletingIds = new Set(),
}: UseRowActionsOptions) {
  const router = useResourceRouter()

  const renderActiveRowActions = useCallback(
    (row: PostRow) => {
      const actions: RowActionConfig[] = [
        {
          label: POST_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => router.push(`/admin/posts/${row.id}`),
        },
      ]

      if (canManage) {
        actions.push({
          label: POST_LABELS.EDIT,
          icon: Pencil,
          onSelect: () => router.push(`/admin/posts/${row.id}/edit`),
        })
      }

      if (canDelete) {
        const isDeleting = deletingIds.has(row.id)
        actions.push({
          label: POST_LABELS.DELETE,
          icon: Trash2,
          onSelect: () => onDelete(row),
          destructive: true,
          disabled: isDeleting || restoringIds.has(row.id) || hardDeletingIds.has(row.id),
          isLoading: isDeleting,
          loadingLabel: POST_LABELS.DELETING,
        })
      }

      if (canManage) {
        const isHardDeleting = hardDeletingIds.has(row.id)
        actions.push({
          label: POST_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
          disabled: deletingIds.has(row.id) || restoringIds.has(row.id) || isHardDeleting,
          isLoading: isHardDeleting,
          loadingLabel: POST_LABELS.HARD_DELETING,
        })
      }

      return renderRowActions(actions)
    },
    [canDelete, canManage, onDelete, onHardDelete, router, deletingIds, restoringIds, hardDeletingIds],
  )

  const renderDeletedRowActions = useCallback(
    (row: PostRow) => {
      const actions: RowActionConfig[] = [
        {
          label: POST_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => router.push(`/admin/posts/${row.id}`),
        },
      ]

      if (canRestore) {
        const isRestoring = restoringIds.has(row.id)
        actions.push({
          label: POST_LABELS.RESTORE,
          icon: RotateCcw,
          onSelect: () => onRestore(row),
          disabled: deletingIds.has(row.id) || isRestoring || hardDeletingIds.has(row.id),
          isLoading: isRestoring,
          loadingLabel: POST_LABELS.RESTORING,
        })
      }

      if (canManage) {
        const isHardDeleting = hardDeletingIds.has(row.id)
        actions.push({
          label: POST_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
          disabled: deletingIds.has(row.id) || restoringIds.has(row.id) || isHardDeleting,
          isLoading: isHardDeleting,
          loadingLabel: POST_LABELS.HARD_DELETING,
        })
      }

      return renderRowActions(actions)
    },
    [canManage, canRestore, onHardDelete, onRestore, router, deletingIds, restoringIds, hardDeletingIds],
  )

  return {
    renderActiveRowActions,
    renderDeletedRowActions,
  }
}

