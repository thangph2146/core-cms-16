"use client"

import * as React from "react"
import { useMemo } from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import {
  BadgeCheck,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  LayoutDashboard,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebarOptional,
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getMenuData } from "@/lib/config/menu-data"
import type { Permission } from "@/lib/permissions"
import { canPerformAnyAction } from "@/lib/permissions"
import { cn } from "@/lib/utils"


export function NavUser({ className }: { className?: string }) {
  const { data: session, status } = useSession()
  
  // Auto-detect sidebar context
  const sidebar = useSidebarOptional()
  const isInSidebar = sidebar !== null
  const isMobile = sidebar?.isMobile ?? false
  
  const user = session?.user
  const primaryRole = session?.roles?.[0]
  
  const getInitials = (name?: string | null) => {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase()
  }

  const adminMenuItems = useMemo(() => {
    const permissions = (session?.permissions || []) as Permission[]
    const roles = (session?.roles || []) as Array<{ name: string }>
    
    if (!permissions.length) return []
    
    return getMenuData(permissions).navMain.filter((item) =>
      canPerformAnyAction(permissions, roles, [...item.permissions])
    )
  }, [session?.permissions, session?.roles])
  
  // Loading state
  if (status === "loading" || !user) {
    if (!isInSidebar) {
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>...</AvatarFallback>
          </Avatar>
        </div>
      )
    }
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg">...</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Đang tải...</span>
              <span className="truncate text-xs">Vui lòng chờ</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const dropdownMenuContent = (
    <DropdownMenuContent
      className={"w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"}
      side={!isInSidebar ? "bottom" : isMobile ? "bottom" : "right"}
      align="end"
      sideOffset={4}
    >
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={user.image || "/avatars/default.jpg"} alt={user.name || ""} />
            <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name || user.email}</span>
            <span className="truncate text-xs">
              {user.email}
              {primaryRole && (
                <span className="ml-1 text-muted-foreground">
                  • {primaryRole.displayName || primaryRole.name}
                </span>
              )}
            </span>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <BadgeCheck className={!isInSidebar ? "mr-2 h-5 w-5" : ""} />
          <span>Tài khoản</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreditCard className={!isInSidebar ? "mr-2 h-5 w-5" : ""} />
          <span>Thanh toán</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      {adminMenuItems.length > 0 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Admin</DropdownMenuLabel>
            <ScrollArea className="max-h-[200px] overflow-y-auto">
              {adminMenuItems.map((item) => {
                if (!React.isValidElement(item.icon)) {
                  console.warn(`Icon is not a valid React element for "${item.title}"`)
                  return (
                    <DropdownMenuItem key={item.url} asChild>
                      <Link href={item.url} className="flex items-center">
                        <LayoutDashboard className={!isInSidebar ? "mr-2 h-5 w-5" : ""} />
                        <span>{item.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  )
                }
                
                return (
                  <DropdownMenuItem key={item.url} asChild>
                    <Link href={item.url} className="flex items-center">
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </ScrollArea>
          </DropdownMenuGroup>
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          signOut({
            callbackUrl: "/auth/sign-in",
          })
        }}
      >
        <LogOut className={!isInSidebar ? "mr-2 h-5 w-5" : ""} />
        <span>Đăng xuất</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  // Auto-detect: render header style if not in sidebar, otherwise render sidebar style
  if (!isInSidebar) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={cn("flex items-center gap-2 px-2", className)}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image || "/avatars/default.jpg"} alt={user.name || ""} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="inline-block text-sm font-medium truncate max-w-[120px]">
              {user.name || user.email}
            </span>
            <ChevronsUpDown className="h-5 w-5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        {dropdownMenuContent}
      </DropdownMenu>
    )
  }

  // Sidebar style (when in sidebar context)
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.image || "/avatars/default.jpg"} alt={user.name || ""} />
                <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name || user.email}</span>
                <span className="truncate text-xs">
                  {primaryRole?.displayName || primaryRole?.name || user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          {dropdownMenuContent}
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
