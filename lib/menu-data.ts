/**
 * Menu data với permissions mapping
 */
import {
  Frame,
  LifeBuoy,
  Send,
  Settings2,
  Users,
  FileText,
  FolderTree,
  Tag,
  MessageSquare,
  Shield,
  Bell,
  Phone,
  GraduationCap,
  LayoutDashboard,
  Home,
} from "lucide-react"
import { MENU_PERMISSIONS, PERMISSIONS } from "./permissions"
import type { Permission } from "./permissions"

export interface MenuItem {
  title: string
  url: string
  icon: typeof LayoutDashboard
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
  icon: typeof Frame
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

  const navMain: MenuItem[] = [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
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
    {
      title: "Người dùng",
      url: "/admin/users",
      icon: Users,
      permissions: MENU_PERMISSIONS.users,
      items: [
        {
          title: "Danh sách",
          url: "/admin/users",
          permissions: [PERMISSIONS.USERS_VIEW],
        },
        {
          title: "Thêm mới",
          url: "/admin/users/new",
          permissions: [PERMISSIONS.USERS_CREATE],
        },
        {
          title: "Phân quyền",
          url: "/admin/users/roles",
          permissions: [PERMISSIONS.USERS_MANAGE],
        },
      ],
    },
    {
      title: "Bài viết",
      url: "/admin/posts",
      icon: FileText,
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
    {
      title: "Danh mục",
      url: "/admin/categories",
      icon: FolderTree,
      permissions: MENU_PERMISSIONS.categories,
      items: [
        {
          title: "Danh sách",
          url: "/admin/categories",
          permissions: [PERMISSIONS.CATEGORIES_VIEW],
        },
        {
          title: "Thêm mới",
          url: "/admin/categories/new",
          permissions: [PERMISSIONS.CATEGORIES_CREATE],
        },
      ],
    },
    {
      title: "Thẻ",
      url: "/admin/tags",
      icon: Tag,
      permissions: MENU_PERMISSIONS.tags,
      items: [
        {
          title: "Danh sách",
          url: "/admin/tags",
          permissions: [PERMISSIONS.TAGS_VIEW],
        },
        {
          title: "Thêm mới",
          url: "/admin/tags/new",
          permissions: [PERMISSIONS.TAGS_CREATE],
        },
      ],
    },
    {
      title: "Bình luận",
      url: "/admin/comments",
      icon: MessageSquare,
      permissions: MENU_PERMISSIONS.comments,
      items: [
        {
          title: "Tất cả",
          url: "/admin/comments",
          permissions: [PERMISSIONS.COMMENTS_VIEW],
        },
        {
          title: "Chờ duyệt",
          url: "/admin/comments/pending",
          permissions: [PERMISSIONS.COMMENTS_APPROVE],
        },
      ],
    },
    {
      title: "Vai trò",
      url: "/admin/roles",
      icon: Shield,
      permissions: MENU_PERMISSIONS.roles,
      items: [
        {
          title: "Danh sách",
          url: "/admin/roles",
          permissions: [PERMISSIONS.ROLES_VIEW],
        },
        {
          title: "Thêm mới",
          url: "/admin/roles/new",
          permissions: [PERMISSIONS.ROLES_CREATE],
        },
      ],
    },
    {
      title: "Tin nhắn",
      url: "/admin/messages",
      icon: Send,
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
    {
      title: "Thông báo",
      url: "/admin/notifications",
      icon: Bell,
      permissions: MENU_PERMISSIONS.notifications,
    },
    {
      title: "Liên hệ",
      url: "/admin/contact-requests",
      icon: Phone,
      permissions: MENU_PERMISSIONS.contact_requests,
      items: [
        {
          title: "Mới",
          url: "/admin/contact-requests",
          permissions: [PERMISSIONS.CONTACT_REQUESTS_VIEW],
        },
        {
          title: "Đã xử lý",
          url: "/admin/contact-requests/resolved",
          permissions: [PERMISSIONS.CONTACT_REQUESTS_VIEW],
        },
      ],
    },
    {
      title: "Học sinh",
      url: "/admin/students",
      icon: GraduationCap,
      permissions: MENU_PERMISSIONS.students,
      items: [
        {
          title: "Danh sách",
          url: "/admin/students",
          permissions: [PERMISSIONS.STUDENTS_VIEW],
        },
        {
          title: "Thêm mới",
          url: "/admin/students/new",
          permissions: [PERMISSIONS.STUDENTS_CREATE],
        },
      ],
    },
    {
      title: "Cài đặt",
      url: "/admin/settings",
      icon: Settings2,
      permissions: MENU_PERMISSIONS.settings,
      items: [
        {
          title: "Chung",
          url: "/admin/settings/general",
          permissions: [PERMISSIONS.SETTINGS_VIEW],
        },
        {
          title: "Bảo mật",
          url: "/admin/settings/security",
          permissions: [PERMISSIONS.SETTINGS_MANAGE],
        },
        {
          title: "Thông báo",
          url: "/admin/settings/notifications",
          permissions: [PERMISSIONS.SETTINGS_VIEW],
        },
      ],
    },
  ]

  const navSecondary: MenuItem[] = [
    {
      title: "Hỗ trợ",
      url: "/admin/support",
      icon: LifeBuoy,
      permissions: [],
    },
    {
      title: "Phản hồi",
      url: "/admin/feedback",
      icon: Send,
      permissions: [],
    },
  ]

  const projects: MenuProject[] = [
    {
      name: "Trang chính",
      url: "/",
      icon: Home,
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
