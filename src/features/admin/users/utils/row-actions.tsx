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
import type { UserRow } from "../types"
import { USER_LABELS, PROTECTED_SUPER_ADMIN_EMAIL } from "../constants"

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
  onDelete: (row: UserRow) => void
  onHardDelete: (row: UserRow) => void
  onRestore: (row: UserRow) => void
  deletingUsers?: Set<string>
  restoringUsers?: Set<string>
  hardDeletingUsers?: Set<string>
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

export function useUserRowActions({
  canDelete,
  canRestore,
  canManage,
  onDelete,
  onHardDelete,
  onRestore,
  deletingUsers = new Set(),
  restoringUsers = new Set(),
  hardDeletingUsers = new Set(),
}: UseRowActionsOptions) {
  const router = useResourceRouter()

  const renderActiveRowActions = useCallback(
    (row: UserRow) => {
      const actions: RowActionConfig[] = [
        {
          label: USER_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => {
            // Logging được xử lý bởi useResourceRouter
            router.push(`/admin/users/${row.id}`)
          },
        },
      ]

      if (canManage) {
        actions.push({
          label: USER_LABELS.EDIT,
          icon: Pencil,
          onSelect: () => {
            // Logging được xử lý bởi useResourceRouter
            router.push(`/admin/users/${row.id}/edit`)
          },
        })
      }

      if (canDelete) {
        const isDeleting = deletingUsers.has(row.id)
        const isSuperAdmin = row.email === PROTECTED_SUPER_ADMIN_EMAIL
        actions.push({
          label: USER_LABELS.DELETE,
          icon: Trash2,
          onSelect: () => onDelete(row),
          destructive: true,
          disabled: isDeleting || restoringUsers.has(row.id) || hardDeletingUsers.has(row.id) || isSuperAdmin,
          isLoading: isDeleting,
          loadingLabel: USER_LABELS.DELETING,
        })
      }

      if (canManage) {
        const isHardDeleting = hardDeletingUsers.has(row.id)
        const isSuperAdmin = row.email === PROTECTED_SUPER_ADMIN_EMAIL
        actions.push({
          label: USER_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
          disabled: deletingUsers.has(row.id) || restoringUsers.has(row.id) || isHardDeleting || isSuperAdmin,
          isLoading: isHardDeleting,
          loadingLabel: USER_LABELS.HARD_DELETING,
        })
      }

      return renderRowActions(actions)
    },
    [canDelete, canManage, onDelete, onHardDelete, router, deletingUsers, restoringUsers, hardDeletingUsers],
  )

  const renderDeletedRowActions = useCallback(
    (row: UserRow) => {
      const actions: RowActionConfig[] = [
        {
          label: USER_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => {
            // Logging được xử lý bởi useResourceRouter
            router.push(`/admin/users/${row.id}`)
          },
        },
      ]

      if (canRestore) {
        const isRestoring = restoringUsers.has(row.id)
        actions.push({
          label: USER_LABELS.RESTORE,
          icon: RotateCcw,
          onSelect: () => onRestore(row),
          disabled: deletingUsers.has(row.id) || isRestoring || hardDeletingUsers.has(row.id),
          isLoading: isRestoring,
          loadingLabel: USER_LABELS.RESTORING,
        })
      }

      if (canManage) {
        const isHardDeleting = hardDeletingUsers.has(row.id)
        const isSuperAdmin = row.email === PROTECTED_SUPER_ADMIN_EMAIL
        actions.push({
          label: USER_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
          disabled: deletingUsers.has(row.id) || restoringUsers.has(row.id) || isHardDeleting || isSuperAdmin,
          isLoading: isHardDeleting,
          loadingLabel: USER_LABELS.HARD_DELETING,
        })
      }

      return renderRowActions(actions)
    },
    [canManage, canRestore, onHardDelete, onRestore, router, deletingUsers, restoringUsers, hardDeletingUsers],
  )

  return {
    renderActiveRowActions,
    renderDeletedRowActions,
  }
}

