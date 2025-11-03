"use client"

import { signOut, useSession } from "next-auth/react"
import {
  BadgeCheck,
  ChevronsUpDown,
  CreditCard,
  LogOut,
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

type NavUserProps = {
  variant?: "sidebar" | "header"
}

export function NavUser({ variant = "sidebar" }: NavUserProps) {
  const { data: session, status } = useSession()
  
  // Only use sidebar context when variant is "sidebar"
  const sidebar = useSidebarOptional()
  const isMobile = variant === "sidebar" ? sidebar?.isMobile ?? false : false
  
  // Lấy thông tin user từ session
  const user = session?.user
  const primaryRole = session?.roles?.[0]
  
  // Tạo avatar fallback từ tên
  const getInitials = (name?: string | null) => {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  
  // Loading state
  if (status === "loading" || !user) {
    if (variant === "header") {
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
      className={variant === "header" ? "w-56" : "w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"}
      side={variant === "header" ? "bottom" : isMobile ? "bottom" : "right"}
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
          <BadgeCheck className={variant === "header" ? "mr-2 h-4 w-4" : ""} />
          <span>Tài khoản</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreditCard className={variant === "header" ? "mr-2 h-4 w-4" : ""} />
          <span>Thanh toán</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          signOut({
            callbackUrl: "/auth/sign-in",
          })
        }}
      >
        <LogOut className={variant === "header" ? "mr-2 h-4 w-4" : ""} />
        <span>Đăng xuất</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  // Header variant
  if (variant === "header") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image || "/avatars/default.jpg"} alt={user.name || ""} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden md:inline-block text-sm font-medium truncate max-w-[120px]">
              {user.name || user.email}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        {dropdownMenuContent}
      </DropdownMenu>
    )
  }

  // Sidebar variant (default)
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
