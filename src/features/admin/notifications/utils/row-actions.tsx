import { useCallback } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { Trash2, MoreHorizontal, Eye, Loader2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { NotificationRow } from "../types"
import { NOTIFICATION_LABELS } from "../constants"

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
  sessionUserId?: string  
  onDelete: (row: NotificationRow) => void
  deletingNotifications?: Set<string>
}

export function renderRowActions(actions: RowActionConfig[]) {
  if (actions.length === 0) {
    return null
  }

  if (actions.length === 1) {
    const singleAction = actions[0]
    const Icon = singleAction.isLoading ? Loader2 : singleAction.icon
    const isDisabled = singleAction.disabled || singleAction.isLoading
    const displayLabel = singleAction.isLoading
      ? singleAction.loadingLabel || singleAction.label
      : singleAction.label
    
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={isDisabled}
        onClick={() => {
          if (!isDisabled) {
            singleAction.onSelect()
          }
        }}
      >
        <Icon className={`mr-2 h-5 w-5 ${singleAction.isLoading ? "animate-spin" : ""}`} />
        {displayLabel}
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
          const isDisabled = action.disabled || action.isLoading
          const displayLabel = action.isLoading
            ? action.loadingLabel || action.label
            : action.label
          const iconClassName = action.destructive
            ? `mr-2 h-5 w-5 text-destructive ${action.isLoading ? "animate-spin" : ""}`
            : `mr-2 h-5 w-5 ${action.isLoading ? "animate-spin" : ""}`
          const itemClassName = action.destructive
            ? "text-destructive focus:text-destructive data-[highlighted]:text-destructive data-[highlighted]:bg-destructive/10 disabled:opacity-50"
            : "data-[highlighted]:bg-accent/10 disabled:opacity-50"
          
          return (
            <DropdownMenuItem
              key={action.label}
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  action.onSelect()
                }
              }}
              className={itemClassName}
            >
              <Icon className={iconClassName} />
              {displayLabel}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function useNotificationRowActions({
  sessionUserId,
  onDelete,
  deletingNotifications = new Set(),
}: UseRowActionsOptions) {
  const router = useResourceRouter()

  const renderRowActionsForNotifications = useCallback(
    (row: NotificationRow) => {
      const isOwner = sessionUserId === row.userId
      const canDelete = isOwner && row.kind !== "SYSTEM"

      const actions: RowActionConfig[] = [
        {
          label: NOTIFICATION_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => router.push(`/admin/notifications/${row.id}`),
        },
      ]

      if (canDelete) {
        const isDeleting = deletingNotifications.has(row.id)
        actions.push({
          label: NOTIFICATION_LABELS.DELETE,
          icon: Trash2,
          onSelect: () => onDelete(row),
          destructive: true,
          disabled: isDeleting,
          isLoading: isDeleting,
          loadingLabel: NOTIFICATION_LABELS.DELETING,
        })
      }

      return renderRowActions(actions)
    },
    [sessionUserId, onDelete, deletingNotifications, router],
  )

  return {
    renderRowActionsForNotifications,
  }
}

