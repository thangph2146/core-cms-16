import * as React from "react"
import type { LucideIcon } from "lucide-react"
import {
  BadgeHelp,
  Bell,
  Command,
  FileText,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  MessageSquare,
  Send,
  Shield,
  Tag,
  Users,
  UserCircle,
  Home,
  Info,
  Mail,
  HelpCircle,
} from "lucide-react"

import {
  MENU_PERMISSIONS,
  PERMISSIONS,
  type Permission,
  applyResourceSegmentToPath,
} from "@/lib/permissions"
import {
  getResourceCreateRoute,
  getResourceMainRoute,
  getResourceSubRoutes,
} from "@/lib/permissions/route-helpers"
import type { MenuItem, MenuSubItem } from "./navigation-types"

type FeatureGroup = "main" | "secondary" | "public"
export type ComponentRenderMode = "static" | "dynamic"

export interface FeatureComponentStrategy {
  id: string
  label: string
  mode: ComponentRenderMode
  modulePath: string
  description?: string
}

interface FeatureNavigationConfig {
  group: FeatureGroup
  order: number
  resourceName?: string
  href?: string
  isActive?: boolean
  autoGenerateSubRoutes?: boolean
  subItems?: ReadonlyArray<MenuSubItem>
}

interface FeatureApiConfig {
  type: "resource" | "custom"
  resourceName?: string
  alias?: string
}

interface FeatureDefinition {
  key: string
  title: string
  description?: string
  permissions: ReadonlyArray<Permission>
  icon: React.ReactElement
  navigation?: FeatureNavigationConfig
  components?: FeatureComponentStrategy[]
  api?: FeatureApiConfig
}

const createIcon = (Icon: LucideIcon) =>
  React.createElement(Icon, { className: "h-4 w-4" })

export const appFeatures: FeatureDefinition[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description: "Tổng quan hệ thống và số liệu realtime",
    permissions: MENU_PERMISSIONS.dashboard,
    icon: createIcon(LayoutDashboard),
    navigation: {
      group: "main",
      order: 10,
      href: "/admin/dashboard",
      isActive: true,
      subItems: [
        { title: "Tổng quan", url: "/admin/dashboard" },
        {
          title: "Thống kê",
          url: "/admin/dashboard/stats",
          permissions: [PERMISSIONS.DASHBOARD_VIEW],
        },
      ],
    },
    components: [
      {
        id: "dashboard.page",
        label: "DashboardPage",
        mode: "static",
        modulePath: "@/app/[resource]/dashboard/page",
        description: "Server component fetches summary cards",
      },
      {
        id: "dashboard.stats",
        label: "DashboardStatsPage",
        mode: "static",
        modulePath: "@/app/[resource]/dashboard/stats/page",
        description: "Server component cho trang số liệu chi tiết",
      },
    ],
  },
  {
    key: "users",
    title: "Người dùng",
    description: "Quản lý tài khoản và phân quyền",
    permissions: MENU_PERMISSIONS.users,
    icon: createIcon(Users),
    navigation: {
      group: "main",
      order: 20,
      resourceName: "users",
      autoGenerateSubRoutes: true,
    },
    api: {
      type: "resource",
      resourceName: "users",
    },
    components: [
      {
        id: "users.table.server",
        label: "UsersTable (Server)",
        mode: "static",
        modulePath: "@/features/admin/users/components/users-table",
        description: "Fetch permissions + cached data",
      },
      {
        id: "users.table.client",
        label: "UsersTableClient",
        mode: "dynamic",
        modulePath: "@/features/admin/users/components/users-table.client",
        description: "Data grid với interactions",
      },
      {
        id: "users.create.server",
        label: "UserCreate",
        mode: "static",
        modulePath: "@/features/admin/users/components/user-create",
      },
      {
        id: "users.create.client",
        label: "UserCreateClient",
        mode: "dynamic",
        modulePath: "@/features/admin/users/components/user-create.client",
      },
      {
        id: "users.edit.server",
        label: "UserEdit",
        mode: "static",
        modulePath: "@/features/admin/users/components/user-edit",
      },
      {
        id: "users.edit.client",
        label: "UserEditClient",
        mode: "dynamic",
        modulePath: "@/features/admin/users/components/user-edit.client",
      },
    ],
  },
  {
    key: "posts",
    title: "Bài viết",
    description: "Soạn thảo và xuất bản nội dung",
    permissions: MENU_PERMISSIONS.posts,
    icon: createIcon(FileText),
    navigation: {
      group: "main",
      order: 30,
      href: "/admin/posts",
      subItems: [
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
    api: {
      type: "resource",
      resourceName: "posts",
    },
  },
  {
    key: "categories",
    title: "Danh mục",
    permissions: MENU_PERMISSIONS.categories,
    icon: createIcon(FolderTree),
    navigation: {
      group: "main",
      order: 40,
      resourceName: "categories",
      autoGenerateSubRoutes: true,
    },
    api: {
      type: "resource",
      resourceName: "categories",
    },
    components: [
      {
        id: "categories.table.server",
        label: "CategoriesTable",
        mode: "static",
        modulePath: "@/features/admin/categories/components/categories-table",
      },
      {
        id: "categories.table.client",
        label: "CategoriesTableClient",
        mode: "dynamic",
        modulePath: "@/features/admin/categories/components/categories-table.client",
      },
      {
        id: "categories.form.server",
        label: "CategoryCreate",
        mode: "static",
        modulePath: "@/features/admin/categories/components/category-create",
      },
      {
        id: "categories.form.client",
        label: "CategoryCreateClient",
        mode: "dynamic",
        modulePath: "@/features/admin/categories/components/category-create.client",
      },
    ],
  },
  {
    key: "tags",
    title: "Thẻ",
    permissions: MENU_PERMISSIONS.tags,
    icon: createIcon(Tag),
    navigation: {
      group: "main",
      order: 50,
      resourceName: "tags",
      autoGenerateSubRoutes: true,
    },
    api: {
      type: "resource",
      resourceName: "tags",
    },
  },
  {
    key: "roles",
    title: "Vai trò",
    permissions: MENU_PERMISSIONS.roles,
    icon: createIcon(Shield),
    navigation: {
      group: "main",
      order: 60,
      resourceName: "roles",
      autoGenerateSubRoutes: true,
    },
    api: {
      type: "resource",
      resourceName: "roles",
    },
    components: [
      {
        id: "roles.table.server",
        label: "RolesTable",
        mode: "static",
        modulePath: "@/features/admin/roles/components/roles-table",
      },
      {
        id: "roles.table.client",
        label: "RolesTableClient",
        mode: "dynamic",
        modulePath: "@/features/admin/roles/components/roles-table.client",
      },
      {
        id: "roles.form.server",
        label: "RoleCreate",
        mode: "static",
        modulePath: "@/features/admin/roles/components/role-create",
      },
      {
        id: "roles.form.client",
        label: "RoleCreateClient",
        mode: "dynamic",
        modulePath: "@/features/admin/roles/components/role-create.client",
      },
    ],
  },
  {
    key: "students",
    title: "Học sinh",
    permissions: MENU_PERMISSIONS.students,
    icon: createIcon(GraduationCap),
    navigation: {
      group: "main",
      order: 70,
      resourceName: "students",
      autoGenerateSubRoutes: true,
    },
    api: {
      type: "resource",
      resourceName: "students",
    },
  },
  {
    key: "messages",
    title: "Tin nhắn",
    permissions: MENU_PERMISSIONS.messages,
    icon: createIcon(Send),
    navigation: {
      group: "main",
      order: 80,
      href: "/admin/messages/inbox",
      subItems: [
        {
          title: "Hộp thư đến",
          url: "/admin/messages/inbox",
          permissions: [PERMISSIONS.MESSAGES_VIEW],
        },
        {
          title: "Hộp thư đã xoá",
          url: "/admin/messages/deleted",
          permissions: [PERMISSIONS.MESSAGES_VIEW],
        },
      ],
    },
  },
  {
    key: "comments",
    title: "Bình luận",
    permissions: MENU_PERMISSIONS.comments,
    icon: createIcon(MessageSquare),
    navigation: {
      group: "main",
      order: 90,
      resourceName: "comments",
      autoGenerateSubRoutes: false,
    },
    api: {
      type: "resource",
      resourceName: "comments",
    },
  },
  {
    key: "notifications",
    title: "Thông báo",
    permissions: MENU_PERMISSIONS.notifications,
    icon: createIcon(Bell),
    navigation: {
      group: "main",
      order: 100,
      href: "/admin/notifications",
    },
    components: [
      {
        id: "notifications.table.server",
        label: "NotificationsTable",
        mode: "static",
        modulePath: "@/features/admin/notifications/components/notifications-table",
      },
      {
        id: "notifications.table.client",
        label: "NotificationsTableClient",
        mode: "dynamic",
        modulePath: "@/features/admin/notifications/components/notifications-table.client",
      },
    ],
  },
  {
    key: "contactRequests",
    title: "Liên hệ",
    permissions: MENU_PERMISSIONS.contact_requests,
    icon: createIcon(BadgeHelp),
    navigation: {
      group: "main",
      order: 110,
      resourceName: "contact-requests",
      autoGenerateSubRoutes: true,
    },
    api: {
      type: "resource",
      resourceName: "contact-requests",
      alias: "contactRequests",
    },
    components: [
      {
        id: "contactRequests.table.server",
        label: "ContactRequestsTable",
        mode: "static",
        modulePath: "@/features/admin/contact-requests/components/contact-requests-table",
      },
      {
        id: "contactRequests.table.client",
        label: "ContactRequestsTableClient",
        mode: "dynamic",
        modulePath: "@/features/admin/contact-requests/components/contact-requests-table.client",
      },
    ],
  },
  {
    key: "sessions",
    title: "Phiên đăng nhập",
    permissions: MENU_PERMISSIONS.sessions,
    icon: createIcon(LogIn),
    navigation: {
      group: "main",
      order: 120,
      resourceName: "sessions",
      autoGenerateSubRoutes: true,
    },
    api: {
      type: "resource",
      resourceName: "sessions",
    },
  },
  {
    key: "accounts",
    title: "Tài khoản",
    description: "Quản lý thông tin cá nhân",
    permissions: MENU_PERMISSIONS.accounts,
    icon: createIcon(UserCircle),
    navigation: {
      group: "main",
      order: 130,
      resourceName: "accounts",
      autoGenerateSubRoutes: true,
    },
    api: {
      type: "resource",
      resourceName: "accounts",
    },
    components: [
      {
        id: "accounts.profile.server",
        label: "AccountProfile",
        mode: "static",
        modulePath: "@/features/admin/accounts/components/account-profile",
      },
      {
        id: "accounts.profile.client",
        label: "AccountProfileClient",
        mode: "dynamic",
        modulePath: "@/features/admin/accounts/components/account-profile.client",
      },
    ],
  },
  {
    key: "support",
    title: "Hỗ trợ",
    permissions: [],
    icon: createIcon(LifeBuoy),
    navigation: {
      group: "secondary",
      order: 10,
      href: "/admin/support",
    },
  },
  {
    key: "feedback",
    title: "Phản hồi",
    permissions: [],
    icon: createIcon(Command),
    navigation: {
      group: "secondary",
      order: 20,
      href: "/admin/feedback",
    },
  },
  // Public Features - Không cần authentication
  {
    key: "home",
    title: "Trang chủ",
    description: "Trang chủ của hệ thống",
    permissions: [], // Empty array = public access
    icon: createIcon(Home),
    navigation: {
      group: "public",
      order: 10,
      href: "/",
    },
  },
  {
    key: "blog",
    title: "Bài viết",
    description: "Xem các bài viết và tin tức",
    permissions: [], // Public access
    icon: createIcon(FileText),
    navigation: {
      group: "public",
      order: 20,
      href: "/bai-viet",
    },
  },
  {
    key: "about",
    title: "Giới thiệu",
    description: "Thông tin về tổ chức",
    permissions: [], // Public access
    icon: createIcon(Info),
    navigation: {
      group: "public",
      order: 30,
      href: "/ve-chung-toi",
    },
  },
  {
    key: "contact",
    title: "Liên hệ",
    description: "Liên hệ với trường",
    permissions: [], // Public access
    icon: createIcon(Mail),
    navigation: {
      group: "public",
      order: 40,
      href: "/lien-he",
    },
  },
  {
    key: "help",
    title: "Trợ giúp",
    description: "Hướng dẫn sử dụng hệ thống",
    permissions: [], // Public access
    icon: createIcon(HelpCircle),
    navigation: {
      group: "public",
      order: 50,
      href: "/huong-dan-su-dung",
    },
  },
] satisfies ReadonlyArray<FeatureDefinition>

export type FeatureKey = (typeof appFeatures)[number]["key"]

const hasAnyPermission = (required: ReadonlyArray<Permission>, granted: Permission[]): boolean => {
  if (!required.length) {
    return true
  }
  return required.some((perm) => granted.includes(perm))
}

const buildResourceSubItems = (resourceName: string, resourceSegment: string): MenuSubItem[] => {
  const items: MenuSubItem[] = []
  const mainRoute = getResourceMainRoute(resourceName)
  if (mainRoute) {
    items.push({
      title: "Danh sách",
      url: applyResourceSegmentToPath(mainRoute.path, resourceSegment),
      permissions: mainRoute.permissions as Permission[],
    })
  }

  const createRoute = getResourceCreateRoute(resourceName)
  if (createRoute) {
    items.push({
      title: "Thêm mới",
      url: applyResourceSegmentToPath(createRoute.path, resourceSegment),
      permissions: createRoute.permissions as Permission[],
    })
  }

  getResourceSubRoutes(resourceName).forEach((route) => {
    const routeName = route.path.split("/").pop() || ""
    const title = routeName
      .split("-")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ")
    items.push({
      title,
      url: applyResourceSegmentToPath(route.path, resourceSegment),
      permissions: route.permissions as Permission[],
    })
  })

  return items
}

const resolveBaseUrl = (nav: FeatureNavigationConfig | undefined, resourceSegment: string): string | null => {
  if (!nav) {
    return null
  }

  if (nav.href) {
    return applyResourceSegmentToPath(nav.href, resourceSegment)
  }

  if (nav.resourceName) {
    const route = getResourceMainRoute(nav.resourceName)
    return route ? applyResourceSegmentToPath(route.path, resourceSegment) : null
  }

  return null
}

const buildMenuItemFromFeature = (
  feature: FeatureDefinition,
  userPermissions: Permission[],
  resourceSegment: string,
): MenuItem | null => {
  const nav = feature.navigation
  if (!nav) {
    return null
  }

  if (!hasAnyPermission(feature.permissions, userPermissions)) {
    return null
  }

  const baseUrl = resolveBaseUrl(nav, resourceSegment)
  if (!baseUrl) {
    return null
  }

  const iconElement = feature.icon

  const subItems: MenuSubItem[] = []

  if (nav.autoGenerateSubRoutes && nav.resourceName) {
    subItems.push(...buildResourceSubItems(nav.resourceName, resourceSegment))
  }

  if (nav.subItems?.length) {
    subItems.push(
      ...nav.subItems.map((item) => ({
        ...item,
        url: item.url ? applyResourceSegmentToPath(item.url, resourceSegment) : item.url,
      })),
    )
  }

  const filteredSubItems = subItems.length
    ? subItems.filter(
        (item) => !item.permissions || hasAnyPermission(item.permissions, userPermissions),
      )
    : undefined

  return {
    key: feature.key,
    title: feature.title,
    url: baseUrl,
    icon: iconElement,
    isActive: nav.isActive,
    items: filteredSubItems && filteredSubItems.length ? filteredSubItems : undefined,
    permissions: feature.permissions,
  }
}

export function buildNavigationMenu(
  group: FeatureGroup,
  userPermissions: Permission[],
  resourceSegment: string,
): MenuItem[] {
  return appFeatures
    .filter((feature) => feature.navigation?.group === group)
    .sort((a, b) => {
      const orderA = a.navigation?.order ?? 0
      const orderB = b.navigation?.order ?? 0
      return orderA - orderB
    })
    .map((feature) => buildMenuItemFromFeature(feature, userPermissions, resourceSegment))
    .filter((item): item is MenuItem => Boolean(item))
}

export function getFeatureComponentStrategies(key: FeatureKey): FeatureComponentStrategy[] {
  return appFeatures.find((feature) => feature.key === key)?.components ?? []
}

export function getFeatureApiConfig(key: FeatureKey): FeatureApiConfig | undefined {
  return appFeatures.find((feature) => feature.key === key)?.api
}
