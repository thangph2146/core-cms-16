import type * as React from "react"
import type { Permission } from "@/lib/permissions"

/**
 * Shared navigation types used across config helpers.
 */

export interface MenuSubItem {
  title: string
  url: string
  permissions?: ReadonlyArray<Permission>
}

export interface MenuItem {
  key?: string
  title: string
  url: string
  icon: React.ReactElement
  isActive?: boolean
  items?: MenuSubItem[]
  permissions: ReadonlyArray<Permission>
  badgeCount?: number
}

export interface MenuProject {
  name: string
  url: string
  icon: React.ReactElement
}
