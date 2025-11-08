/**
 * Menu data với permissions mapping
 * Sử dụng routes từ route-config.ts để đảm bảo consistency
 */
import * as React from "react"
import { MENU_PERMISSIONS, PERMISSIONS } from "@/lib/permissions"
import type { Permission } from "@/lib/permissions"
import {
  getResourceMainRoute,
  getResourceCreateRoute,
  getResourceSubRoutes,
} from "@/lib/permissions/route-helpers"
import { LayoutDashboard, Users, FileText, FolderTree, Tag, MessageSquare, Shield, Send, Bell, Phone, GraduationCap, LifeBuoy, Home, LogIn } from "lucide-react"

export interface MenuItem {
  title: string
  url: string
  icon: React.ReactElement
  isActive?: boolean
  items?: MenuSubItem[]
  permissions: ReadonlyArray<Permission>
}

export interface MenuSubItem {
  title: string
  url: string
  permissions?: ReadonlyArray<Permission>
}

export interface MenuProject {
  name: string
  url: string
  icon: React.ReactElement
}

export function getMenuData(userPermissions: Permission[]): {
  navMain: MenuItem[]
  navSecondary: MenuItem[]
  projects: MenuProject[]
} {
  // Helper function to check if menu item should be shown
  const canShow = (permissions: ReadonlyArray<Permission>) => {
    return permissions.some((perm) => userPermissions.includes(perm))
  }

  // Helper function để tạo menu item từ route config
  const createMenuItemFromRoute = (
    resourceName: string,
    title: string,
    icon: React.ReactElement,
    options?: {
      isActive?: boolean
      customSubItems?: Array<{ title: string; url: string; permissions?: Permission[] }>
      iconOverride?: React.ReactElement
    }
  ): MenuItem | null => {
    const mainRoute = getResourceMainRoute(resourceName)
    if (!mainRoute) return null

    const createRoute = getResourceCreateRoute(resourceName)
    const subRoutes = getResourceSubRoutes(resourceName)

    const items: MenuSubItem[] = []

    // Add main route as "Danh sách"
    items.push({
      title: "Danh sách",
      url: mainRoute.path,
      permissions: mainRoute.permissions as Permission[],
    })

    // Add create route if exists
    if (createRoute) {
      items.push({
        title: "Thêm mới",
        url: createRoute.path,
        permissions: createRoute.permissions as Permission[],
      })
    }

    // Add custom sub routes
    if (options?.customSubItems) {
      items.push(...options.customSubItems)
    } else {
      // Add auto-detected sub routes
      subRoutes.forEach((route) => {
        const routeName = route.path.split("/").pop() || ""
        const title = routeName
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
        items.push({
          title,
          url: route.path,
          permissions: route.permissions as Permission[],
        })
      })
    }

    return {
      title,
      url: mainRoute.path,
      icon: options?.iconOverride || icon,
      isActive: options?.isActive,
      permissions: mainRoute.permissions as Permission[],
      items: items.length > 0 ? items : undefined,
    }
  }

  const navMain: MenuItem[] = [
    // Dashboard - special case với custom items
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: React.createElement(LayoutDashboard, { className: "h-4 w-4" }),
      isActive: true,
      permissions: MENU_PERMISSIONS.dashboard,
      items: [
        {
          title: "Tổng quan",
          url: "/admin/dashboard",
        },
        {
          title: "Thống kê",
          url: "/admin/dashboard/stats",
          permissions: [PERMISSIONS.DASHBOARD_VIEW],
        },
      ],
    },
    // Users
    createMenuItemFromRoute("users", "Người dùng", React.createElement(Users, { className: "h-4 w-4" })),
    // Posts - special case với custom items
    {
      title: "Bài viết",
      url: "/admin/posts",
      icon: React.createElement(FileText, { className: "h-4 w-4" }),
      permissions: MENU_PERMISSIONS.posts,
      items: [
        {
          title: "Tất cả bài viết",
          url: "/admin/posts",
          permissions: [PERMISSIONS.POSTS_VIEW],
        },
        {
          title: "Viết bài mới",
          url: "/admin/posts/new",
          permissions: [PERMISSIONS.POSTS_CREATE],
        },
        {
          title: "Bài viết của tôi",
          url: "/admin/posts/my-posts",
          permissions: [PERMISSIONS.POSTS_VIEW],
        },
        {
          title: "Đã xuất bản",
          url: "/admin/posts/published",
          permissions: [PERMISSIONS.POSTS_PUBLISH],
        },
      ],
    },
    // Categories
    createMenuItemFromRoute("categories", "Danh mục", React.createElement(FolderTree, { className: "h-4 w-4" })),
    // Tags
    createMenuItemFromRoute("tags", "Thẻ", React.createElement(Tag, { className: "h-4 w-4" })),
    // Roles
    createMenuItemFromRoute("roles", "Vai trò", React.createElement(Shield, { className: "h-4 w-4" })),
    // Messages - special case với custom items
    {
      title: "Tin nhắn",
      url: "/admin/messages",
      icon: React.createElement(Send, { className: "h-4 w-4" }),
      permissions: MENU_PERMISSIONS.messages,
      items: [
        {
          title: "Hộp thư đến",
          url: "/admin/messages/inbox",
          permissions: [PERMISSIONS.MESSAGES_VIEW],
        },
        {
          title: "Đã gửi",
          url: "/admin/messages/sent",
          permissions: [PERMISSIONS.MESSAGES_VIEW],
        },
      ],
    },
    // Students
    createMenuItemFromRoute("students", "Học sinh", React.createElement(GraduationCap, { className: "h-4 w-4" })),
    // Comments - no sub items
    {
      title: "Bình luận",
      url: "/admin/comments",
      icon: React.createElement(MessageSquare, { className: "h-4 w-4" }),
      permissions: MENU_PERMISSIONS.comments,
    },
    // Notifications - no sub items
    {
      title: "Thông báo",
      url: "/admin/notifications",
      icon: React.createElement(Bell, { className: "h-4 w-4" }),
      permissions: MENU_PERMISSIONS.notifications,
    },
    // Contact Requests - special case với custom items
    {
      title: "Liên hệ",
      url: "/admin/contact-requests",
      icon: React.createElement(Phone, { className: "h-4 w-4" }),
      permissions: MENU_PERMISSIONS.contact_requests,
    },
    // Sessions
    {
      title: "Phiên đăng nhập",
      url: "/admin/sessions",
      icon: React.createElement(LogIn, { className: "h-4 w-4" }),
      permissions: MENU_PERMISSIONS.sessions,
    }
  ].filter((item): item is MenuItem => item !== null)

  const navSecondary: MenuItem[] = [
    {
      title: "Hỗ trợ",
      url: "/admin/support",
      icon: React.createElement(LifeBuoy, { className: "h-4 w-4" }),
      permissions: [],
    },
    {
      title: "Phản hồi",
      url: "/admin/feedback",
      icon: React.createElement(Send, { className: "h-4 w-4" }),
      permissions: [],
    },

  ]

  const projects: MenuProject[] = [
    {
      name: "Trang chính",
      url: "/",
      icon: React.createElement(Home, { className: "h-4 w-4" }),
    }
  ]

  // Filter menu items based on permissions
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items
      .filter((item) => canShow(item.permissions))
      .map((item) => ({
        ...item,
        items: item.items
          ? item.items.filter((subItem) =>
            !subItem.permissions || canShow(subItem.permissions)
          )
          : undefined,
      }))
  }

  return {
    navMain: filterMenuItems(navMain),
    navSecondary: filterMenuItems(navSecondary),
    projects,
  }
}
