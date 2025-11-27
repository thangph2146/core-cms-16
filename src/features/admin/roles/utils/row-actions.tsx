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
import type { RoleRow } from "../types"
import { ROLE_LABELS } from "../constants/messages"

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
  onDelete: (row: RoleRow) => void
  onHardDelete: (row: RoleRow) => void
  onRestore: (row: RoleRow) => void
  deletingRoles?: Set<string>
  restoringRoles?: Set<string>
  hardDeletingRoles?: Set<string>
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

export function useRoleRowActions({
  canDelete,
  canRestore,
  canManage,
  onDelete,
  onHardDelete,
  onRestore,
  deletingRoles = new Set(),
  restoringRoles = new Set(),
  hardDeletingRoles = new Set(),
}: UseRowActionsOptions) {
  const router = useResourceRouter()

  const renderActiveRowActions = useCallback(
    (row: RoleRow) => {
      const actions: RowActionConfig[] = [
        {
          label: ROLE_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => router.push(`/admin/roles/${row.id}`),
        },
      ]

      if (canManage) {
        actions.push({
          label: ROLE_LABELS.EDIT,
          icon: Pencil,
          onSelect: () => router.push(`/admin/roles/${row.id}/edit`),
        })
      }

      if (canDelete) {
        const isDeleting = deletingRoles.has(row.id)
        actions.push({
          label: ROLE_LABELS.DELETE,
          icon: Trash2,
          onSelect: () => onDelete(row),
          destructive: true,
          disabled: row.name === "super_admin" || isDeleting || restoringRoles.has(row.id) || hardDeletingRoles.has(row.id),
          isLoading: isDeleting,
          loadingLabel: ROLE_LABELS.DELETING,
        })
      }

      if (canManage) {
        const isHardDeleting = hardDeletingRoles.has(row.id)
        actions.push({
          label: ROLE_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
          disabled: row.name === "super_admin" || deletingRoles.has(row.id) || restoringRoles.has(row.id) || isHardDeleting,
          isLoading: isHardDeleting,
          loadingLabel: ROLE_LABELS.HARD_DELETING,
        })
      }

      return renderRowActions(actions)
    },
    [canDelete, canManage, onDelete, onHardDelete, router, deletingRoles, restoringRoles, hardDeletingRoles],
  )

  const renderDeletedRowActions = useCallback(
    (row: RoleRow) => {
      const actions: RowActionConfig[] = [
        {
          label: ROLE_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => router.push(`/admin/roles/${row.id}`),
        },
      ]

      if (canRestore) {
        const isRestoring = restoringRoles.has(row.id)
        actions.push({
          label: ROLE_LABELS.RESTORE,
          icon: RotateCcw,
          onSelect: () => onRestore(row),
          disabled: deletingRoles.has(row.id) || isRestoring || hardDeletingRoles.has(row.id),
          isLoading: isRestoring,
          loadingLabel: ROLE_LABELS.RESTORING,
        })
      }

      if (canManage) {
        const isHardDeleting = hardDeletingRoles.has(row.id)
        actions.push({
          label: ROLE_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
          disabled: row.name === "super_admin" || deletingRoles.has(row.id) || restoringRoles.has(row.id) || isHardDeleting,
          isLoading: isHardDeleting,
          loadingLabel: ROLE_LABELS.HARD_DELETING,
        })
      }

      return renderRowActions(actions)
    },
    [canManage, canRestore, onHardDelete, onRestore, router, deletingRoles, restoringRoles, hardDeletingRoles],
  )

  return {
    renderActiveRowActions,
    renderDeletedRowActions,
  }
}

