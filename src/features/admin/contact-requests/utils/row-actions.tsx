import { useCallback } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle, Eye, Pencil, Check, X, Loader2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ContactRequestRow } from "../types"
import { CONTACT_REQUEST_LABELS } from "../constants"

export interface RowActionConfig {
  label: string
  icon: LucideIcon
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  isLoading?: boolean
  loadingLabel?: string
}

interface UseContactRequestRowActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  canUpdate?: boolean
  onToggleRead: (row: ContactRequestRow, checked: boolean) => void
  onDelete: (row: ContactRequestRow) => void
  onHardDelete: (row: ContactRequestRow) => void
  onRestore: (row: ContactRequestRow) => void
  markingReadRequests?: Set<string>
  markingUnreadRequests?: Set<string>
  deletingRequests?: Set<string>
  restoringRequests?: Set<string>
  hardDeletingRequests?: Set<string>
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

export function useContactRequestRowActions({
  canDelete,
  canRestore,
  canManage,
  canUpdate = false,
  onToggleRead,
  onDelete,
  onHardDelete,
  onRestore,
  markingReadRequests = new Set(),
  markingUnreadRequests = new Set(),
  deletingRequests = new Set(),
  restoringRequests = new Set(),
  hardDeletingRequests = new Set(),
}: UseContactRequestRowActionsOptions) {
  const router = useResourceRouter()

  const renderActiveRowActions = useCallback(
    (row: ContactRequestRow) => {
      const actions: RowActionConfig[] = [
        {
          label: CONTACT_REQUEST_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => router.push(`/admin/contact-requests/${row.id}`),
        },
      ]

      if (canUpdate) {
        actions.push({
          label: CONTACT_REQUEST_LABELS.EDIT,
          icon: Pencil,
          onSelect: () => router.push(`/admin/contact-requests/${row.id}/edit`),
        })
      }

      if (canUpdate) {
        if (row.isRead) {
          const isMarkingUnread = markingUnreadRequests.has(row.id)
          actions.push({
            label: CONTACT_REQUEST_LABELS.MARK_UNREAD,
            icon: X,
            onSelect: () => onToggleRead(row, false),
            disabled: isMarkingUnread || markingReadRequests.has(row.id) || deletingRequests.has(row.id) || restoringRequests.has(row.id) || hardDeletingRequests.has(row.id),
            isLoading: isMarkingUnread,
            loadingLabel: CONTACT_REQUEST_LABELS.MARKING_UNREAD,
          })
        } else {
          const isMarkingRead = markingReadRequests.has(row.id)
          actions.push({
            label: CONTACT_REQUEST_LABELS.MARK_READ,
            icon: Check,
            onSelect: () => onToggleRead(row, true),
            disabled: isMarkingRead || markingUnreadRequests.has(row.id) || deletingRequests.has(row.id) || restoringRequests.has(row.id) || hardDeletingRequests.has(row.id),
            isLoading: isMarkingRead,
            loadingLabel: CONTACT_REQUEST_LABELS.MARKING_READ,
          })
        }
      }

      if (canDelete) {
        const isDeleting = deletingRequests.has(row.id)
        actions.push({
          label: CONTACT_REQUEST_LABELS.DELETE,
          icon: Trash2,
          onSelect: () => onDelete(row),
          destructive: true,
          disabled: isDeleting || markingReadRequests.has(row.id) || markingUnreadRequests.has(row.id) || restoringRequests.has(row.id) || hardDeletingRequests.has(row.id),
          isLoading: isDeleting,
          loadingLabel: CONTACT_REQUEST_LABELS.DELETING,
        })
      }

      if (canManage) {
        const isHardDeleting = hardDeletingRequests.has(row.id)
        actions.push({
          label: CONTACT_REQUEST_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
          disabled: deletingRequests.has(row.id) || markingReadRequests.has(row.id) || markingUnreadRequests.has(row.id) || restoringRequests.has(row.id) || isHardDeleting,
          isLoading: isHardDeleting,
          loadingLabel: CONTACT_REQUEST_LABELS.HARD_DELETING,
        })
      }

      return renderRowActions(actions)
    },
    [canDelete, canManage, canUpdate, onDelete, onHardDelete, onToggleRead, router, markingReadRequests, markingUnreadRequests, deletingRequests, restoringRequests, hardDeletingRequests],
  )

  const renderDeletedRowActions = useCallback(
    (row: ContactRequestRow) => {
      const actions: RowActionConfig[] = [
        {
          label: CONTACT_REQUEST_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => router.push(`/admin/contact-requests/${row.id}`),
        },
      ]

      if (canRestore) {
        const isRestoring = restoringRequests.has(row.id)
        actions.push({
          label: CONTACT_REQUEST_LABELS.RESTORE,
          icon: RotateCcw,
          onSelect: () => onRestore(row),
          disabled: deletingRequests.has(row.id) || isRestoring || hardDeletingRequests.has(row.id),
          isLoading: isRestoring,
          loadingLabel: CONTACT_REQUEST_LABELS.RESTORING,
        })
      }

      if (canManage) {
        const isHardDeleting = hardDeletingRequests.has(row.id)
        actions.push({
          label: CONTACT_REQUEST_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
          disabled: deletingRequests.has(row.id) || restoringRequests.has(row.id) || isHardDeleting,
          isLoading: isHardDeleting,
          loadingLabel: CONTACT_REQUEST_LABELS.HARD_DELETING,
        })
      }

      return renderRowActions(actions)
    },
    [canManage, canRestore, onHardDelete, onRestore, router, deletingRequests, restoringRequests, hardDeletingRequests],
  )

  return {
    renderActiveRowActions,
    renderDeletedRowActions,
  }
}

