"use client";

import * as React from "react";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { disconnectSocket } from "@/hooks/use-socket";
import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  LayoutDashboard,
  BadgeHelp,
  Bell,
  FileText,
  FolderTree,
  GraduationCap,
  LifeBuoy,
  LogIn,
  MessageSquare,
  Send,
  Shield,
  Tag,
  Users,
  UserCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Icon mapping để tạo lại icon trong client component
const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Users,
  posts: FileText,
  categories: FolderTree,
  tags: Tag,
  roles: Shield,
  students: GraduationCap,
  messages: Send,
  comments: MessageSquare,
  notifications: Bell,
  contactRequests: BadgeHelp,
  sessions: LogIn,
  accounts: UserCircle,
  support: LifeBuoy,
};

const createIcon = (Icon: LucideIcon) =>
  React.createElement(Icon, { className: "h-4 w-4" });

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebarOptional,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMenuData } from "@/lib/config/menu-data";
import type { Permission } from "@/lib/permissions";
import {
  canPerformAnyAction,
  getResourceSegmentForRoles,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useClientOnly } from "@/hooks/use-client-only";
import { useUnreadCounts } from "@/hooks/use-unread-counts";
import { useNotificationsSocketBridge } from "@/hooks/use-notifications";
import { useContactRequestsSocketBridge } from "@/features/admin/contact-requests/hooks/use-contact-requests-socket-bridge";
import { useSocket } from "@/hooks/use-socket";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function NavUser({ className }: { className?: string }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const userId = session?.user?.id;
  const primaryRoleName = session?.roles?.[0]?.name ?? null;

  const queryClient = useQueryClient();

  // Chỉ render DropdownMenu sau khi component đã mount trên client để tránh hydration mismatch
  // Radix UI generate ID random khác nhau giữa server và client
  const isMounted = useClientOnly();

  // Auto-detect sidebar context
  const sidebar = useSidebarOptional();
  const isInSidebar = sidebar !== null;
  const isMobile = sidebar?.isMobile ?? false;

  const user = session?.user;
  const primaryRole = session?.roles?.[0];

  // Setup socket bridge cho notifications
  useNotificationsSocketBridge();

  // Setup socket bridge cho contact requests
  useContactRequestsSocketBridge();

  // Setup socket cho messages để invalidate unread counts
  const { socket } = useSocket({
    userId,
    role: primaryRoleName,
  });

  // Track socket connection status để tắt polling khi socket connected
  const [isSocketConnected, setIsSocketConnected] = React.useState(false);

  React.useEffect(() => {
    if (!socket) {
      setIsSocketConnected(false);
      return;
    }

    // Check initial connection status
    setIsSocketConnected(socket.connected);

    const handleConnect = () => {
      setIsSocketConnected(true);
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.unreadCounts.user(userId),
        });
      }
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, queryClient, userId]);

  React.useEffect(() => {
    if (!socket || !userId) return;

    const invalidateUnreadCounts = () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.unreadCounts.user(userId),
      });
    };

    socket.on("message:new", invalidateUnreadCounts);
    socket.on("message:updated", invalidateUnreadCounts);

    return () => {
      socket.off("message:new", invalidateUnreadCounts);
      socket.off("message:updated", invalidateUnreadCounts);
    };
  }, [socket, userId, queryClient]);

  // Get unread counts với realtime updates
  // Tắt polling khi có socket connection (socket sẽ handle real-time updates)
  const { data: unreadCounts } = useUnreadCounts({
    refetchInterval: 60000, // 60 seconds (fallback khi không có socket)
    enabled: !!userId,
    disablePolling: isSocketConnected, // Tắt polling nếu có socket connection
  });

  // Socket bridge đã handle unread counts updates, không cần invalidate ở đây nữa

  const unreadMessagesCount = unreadCounts?.unreadMessages || 0;
  const unreadNotificationsCount = unreadCounts?.unreadNotifications || 0;
  const contactRequestsCount = unreadCounts?.contactRequests || 0;

  // Helper function để check nếu pathname match với menu item URL
  const isItemActive = React.useCallback(
    (item: { url: string; items?: Array<{ url: string }> }): boolean => {
      if (!pathname) return false;

      // Normalize paths để so sánh
      const normalizedPathname = pathname.toLowerCase();
      const normalizedItemUrl = item.url.toLowerCase();

      // Exact match
      if (normalizedPathname === normalizedItemUrl) return true;

      // Check sub-items trước (quan trọng cho messages có sub-items)
      if (item.items && item.items.length > 0) {
        const hasActiveSubItem = item.items.some((subItem) => {
          const normalizedSubUrl = subItem.url.toLowerCase();
          return (
            normalizedPathname === normalizedSubUrl ||
            normalizedPathname.startsWith(normalizedSubUrl + "/")
          );
        });
        if (hasActiveSubItem) return true;
      }

      // Check nếu pathname bắt đầu với item.url (cho nested routes)
      // Nhưng cần cẩn thận để không match quá rộng
      if (normalizedPathname.startsWith(normalizedItemUrl + "/")) {
        // Chỉ active nếu không có sub-items hoặc sub-items không match
        if (item.items && item.items.length > 0) {
          return false; // Đã check sub-items ở trên
        }
        return true;
      }

      return false;
    },
    [pathname]
  );

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const adminMenuItems = useMemo(() => {
    const permissions = (session?.permissions || []) as Permission[];
    const roles = (session?.roles || []) as Array<{ name: string }>;

    if (!permissions.length) return [];

    // Tính resource segment dựa trên roles của user, không phụ thuộc vào URL hiện tại
    const resourceSegment = getResourceSegmentForRoles(roles);

    const menuItems = getMenuData(
      permissions,
      roles,
      resourceSegment
    ).navMain.filter((item) =>
      canPerformAnyAction(permissions, roles, [...item.permissions])
    );

    // Map unread counts và active state vào menu items dựa trên key
    // Tạo lại icon trong client component vì React elements không thể serialize qua server/client boundary
    return menuItems.map((item) => {
      const isActive = isItemActive(item);

      // Tạo lại icon dựa trên feature key
      const iconKey = item.key || "";
      const IconComponent = iconMap[iconKey];
      const icon = IconComponent ? createIcon(IconComponent) : item.icon;

      let updatedItem = {
        ...item,
        icon,
        isActive,
      };

      if (item.key === "messages") {
        updatedItem = {
          ...updatedItem,
          badgeCount: unreadMessagesCount,
        };
      }
      if (item.key === "notifications") {
        updatedItem = {
          ...updatedItem,
          badgeCount: unreadNotificationsCount,
        };
      }
      if (item.key === "contactRequests") {
        updatedItem = {
          ...updatedItem,
          badgeCount: contactRequestsCount,
        };
      }

      return updatedItem;
    });
  }, [
    session,
    unreadMessagesCount,
    unreadNotificationsCount,
    contactRequestsCount,
    isItemActive,
  ]);

  // Tính route cho accounts dựa trên resource segment
  const accountsRoute = useMemo(() => {
    const roles = (session?.roles || []) as Array<{ name: string }>;
    const resourceSegment = getResourceSegmentForRoles(roles);
    return `/${resourceSegment}/accounts`;
  }, [session?.roles]);

  // Loading state
  if (status === "loading" || !user) {
    if (!isInSidebar) {
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>...</AvatarFallback>
          </Avatar>
        </div>
      );
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
    );
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
            <AvatarImage
              src={user.image || "/avatars/default.jpg"}
              alt={user.name || ""}
            />
            <AvatarFallback className="rounded-lg">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">
              {user.name || user.email}
            </span>
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
        <DropdownMenuItem asChild>
          <Link
            href={accountsRoute}
            className={cn(
              "flex items-center justify-between w-full data-[highlighted]:bg-accent/20"
            )}
          >
            <div className="flex items-center">
              <BadgeCheck className={!isInSidebar ? "mr-2 h-5 w-5" : ""} />
              <span>Tài khoản</span>
            </div>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      {adminMenuItems.length > 0 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Admin</DropdownMenuLabel>
            <ScrollArea className="max-h-[200px] overflow-y-auto">
              {adminMenuItems.map((item) => {
                const showBadge = (item.badgeCount ?? 0) > 0;
                const isActive = item.isActive ?? false;

                if (!React.isValidElement(item.icon)) {
                  console.warn(
                    `Icon is not a valid React element for "${item.title}"`
                  );
                  return (
                    <DropdownMenuItem key={item.url} asChild>
                      <Link
                        href={item.url}
                        className={cn(
                          "flex items-center justify-between w-full data-[highlighted]:bg-accent/20",
                          isActive && "bg-accent/20"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <LayoutDashboard
                            className={!isInSidebar ? "mr-2 h-5 w-5" : ""}
                          />
                          <span>{item.title}</span>
                        </div>
                        {showBadge && (
                          <Badge
                            variant="destructive"
                            className="ml-auto shrink-0"
                          >
                            {(item.badgeCount ?? 0) > 99
                              ? "99+"
                              : item.badgeCount}
                          </Badge>
                        )}
                      </Link>
                    </DropdownMenuItem>
                  );
                }

                return (
                  <DropdownMenuItem key={item.url} asChild>
                    <Link
                      href={item.url}
                      className={cn(
                        "flex items-center justify-between w-full data-[highlighted]:bg-accent/10",
                        isActive && "bg-accent/20"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.title}</span>
                      </div>
                      {showBadge && (
                        <Badge
                          variant="destructive"
                          className="ml-auto shrink-0"
                        >
                          {(item.badgeCount ?? 0) > 99
                            ? "99+"
                            : item.badgeCount}
                        </Badge>
                      )}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </ScrollArea>
          </DropdownMenuGroup>
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          // Disconnect socket trước khi đăng xuất
          disconnectSocket();
          signOut({
            callbackUrl: "/auth/sign-in",
          });
        }}
        className="text-destructive focus:text-destructive data-[highlighted]:text-destructive data-[highlighted]:bg-destructive/10 disabled:opacity-50"
      >
        <LogOut
          className={cn("text-destructive", !isInSidebar ? "mr-2 h-5 w-5" : "")}
        />
        <span>Đăng xuất</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  // Render placeholder trên server để tránh hydration mismatch
  if (!isMounted) {
    if (!isInSidebar) {
      return (
        <div className="flex items-center gap-2" suppressHydrationWarning>
          <Avatar className="h-8 w-8" suppressHydrationWarning>
            <AvatarImage
              src={user.image || "/avatars/default.jpg"}
              alt={user.name || ""}
            />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="inline-block text-sm font-medium truncate max-w-[120px]" suppressHydrationWarning>
            {user.name || user.email}
          </span>
        </div>
      );
    }
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <Avatar className="h-8 w-8 rounded-lg" suppressHydrationWarning>
              <AvatarImage
                src={user.image || "/avatars/default.jpg"}
                alt={user.name || ""}
              />
              <AvatarFallback className="rounded-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight" suppressHydrationWarning>
              <span className="truncate font-medium" suppressHydrationWarning>
                {user.name || user.email}
              </span>
              <span className="truncate text-xs" suppressHydrationWarning>
                {primaryRole?.displayName || primaryRole?.name || user.email}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Auto-detect: render header style if not in sidebar, otherwise render sidebar style
  if (!isInSidebar) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn("flex items-center gap-2 px-2", className)}
            suppressHydrationWarning
          >
            <Avatar className="h-8 w-8" suppressHydrationWarning>
              <AvatarImage
                src={user.image || "/avatars/default.jpg"}
                alt={user.name || ""}
              />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="inline-block text-sm font-medium truncate max-w-[120px]" suppressHydrationWarning>
              {user.name || user.email}
            </span>
            <ChevronsUpDown className="h-5 w-5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        {dropdownMenuContent}
      </DropdownMenu>
    );
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
                <AvatarImage
                  src={user.image || "/avatars/default.jpg"}
                  alt={user.name || ""}
                />
                <AvatarFallback className="rounded-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.name || user.email}
                </span>
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
  );
}
