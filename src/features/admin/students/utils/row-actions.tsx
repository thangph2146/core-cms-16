/**
 * Row actions utilities cho students table
 */

import { useCallback } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle, Eye, Pencil } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { StudentRow } from "../types"
import { STUDENT_LABELS } from "../constants"

export interface RowActionConfig {
  label: string
  icon: LucideIcon
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

interface UseStudentRowActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  canUpdate?: boolean
  onDelete: (row: StudentRow) => void
  onHardDelete: (row: StudentRow) => void
  onRestore: (row: StudentRow) => void
}

export function renderRowActions(actions: RowActionConfig[]) {
  if (actions.length === 0) {
    return null
  }

  if (actions.length === 1) {
    const singleAction = actions[0]
    const Icon = singleAction.icon
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={singleAction.disabled}
        onClick={() => {
          if (singleAction.disabled) return
          singleAction.onSelect()
        }}
      >
        <Icon className="mr-2 h-5 w-5" />
        {singleAction.label}
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
          const Icon = action.icon
          return (
            <DropdownMenuItem
              key={action.label}
              disabled={action.disabled}
              onClick={() => {
                if (action.disabled) return
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
                  action.destructive ? "mr-2 h-5 w-5 text-destructive" : "mr-2 h-5 w-5"
                }
              />
              {action.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function useStudentRowActions({
  canDelete,
  canRestore,
  canManage,
  canUpdate = false,
  onDelete,
  onHardDelete,
  onRestore,
}: UseStudentRowActionsOptions) {
  const router = useResourceRouter()

  const renderActiveRowActions = useCallback(
    (row: StudentRow) => {
      const actions: RowActionConfig[] = [
        {
          label: STUDENT_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => router.push(`/admin/students/${row.id}`),
        },
      ]

      if (canUpdate) {
        actions.push({
          label: STUDENT_LABELS.EDIT,
          icon: Pencil,
          onSelect: () => router.push(`/admin/students/${row.id}/edit`),
        })
      }

      if (canDelete) {
        actions.push({
          label: STUDENT_LABELS.DELETE,
          icon: Trash2,
          onSelect: () => onDelete(row),
          destructive: true,
        })
      }

      if (canManage) {
        actions.push({
          label: STUDENT_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
        })
      }

      return renderRowActions(actions)
    },
    [canDelete, canManage, canUpdate, onDelete, onHardDelete, router],
  )

  const renderDeletedRowActions = useCallback(
    (row: StudentRow) => {
      const actions: RowActionConfig[] = [
        {
          label: STUDENT_LABELS.VIEW_DETAIL,
          icon: Eye,
          onSelect: () => router.push(`/admin/students/${row.id}`),
        },
      ]

      if (canRestore) {
        actions.push({
          label: STUDENT_LABELS.RESTORE,
          icon: RotateCcw,
          onSelect: () => onRestore(row),
        })
      }

      if (canManage) {
        actions.push({
          label: STUDENT_LABELS.HARD_DELETE,
          icon: AlertTriangle,
          onSelect: () => onHardDelete(row),
          destructive: true,
        })
      }

      return renderRowActions(actions)
    },
    [canManage, canRestore, onHardDelete, onRestore, router],
  )

  return {
    renderActiveRowActions,
    renderDeletedRowActions,
  }
}

