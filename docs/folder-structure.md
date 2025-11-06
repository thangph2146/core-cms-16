# Folder Structure & Code Organization - Next.js 16

Tài liệu này mô tả cách tổ chức folder và code theo chuẩn Next.js 16, dựa trên cấu trúc thực tế của feature **Users** trong dự án.

## 📋 Tổng quan

Dự án sử dụng **Feature-based Architecture** với Next.js 16 App Router, tách biệt rõ ràng giữa:
- **App Routes** (`src/app/`): Pages và API routes
- **Features** (`src/features/`): Business logic, components, server functions
- **Shared Components** (`src/components/`): Reusable UI components
- **Lib** (`src/lib/`): Utilities, configs, helpers

## 🏗️ Cấu trúc Folder

### 1. App Routes (`src/app/`)

Chứa **Pages** (Server Components) và **API Routes** theo Next.js App Router convention.

```
src/app/
├── admin/
│   └── users/
│       ├── page.tsx                    # List page (Server Component)
│       ├── [id]/
│       │   ├── page.tsx               # Detail page (Server Component)
│       │   └── edit/
│       │       └── page.tsx           # Edit page (Server Component)
│       └── new/
│           └── page.tsx               # Create page (Server Component)
└── api/
    └── admin/
        └── users/
            ├── route.ts               # GET (list), POST (create)
            ├── [id]/
            │   ├── route.ts           # GET, PUT, DELETE
            │   ├── restore/
            │   │   └── route.ts       # POST (restore)
            │   └── hard-delete/
            │       └── route.ts      # DELETE (hard delete)
            └── bulk/
                └── route.ts          # POST (bulk operations)
```

**Lưu ý:** Cấu trúc này áp dụng cho tất cả các features trong admin (users, categories, tags, roles, contact-requests, notifications).

#### Pages (Server Components)

**Quy tắc:**
- ✅ Chứa layout (AdminHeader, breadcrumbs) và gọi feature components
- ✅ Fetch permissions và pass xuống components (cho list pages)
- ✅ Có thể fetch data để check not found trước (cho detail/edit pages)
- ✅ Không chứa business logic phức tạp
- ✅ Không chứa UI logic phức tạp

**Pattern 1: List Page (không fetch data)**

```typescript
// src/app/admin/users/page.tsx
import { AdminHeader } from "@/components/headers"
import { PERMISSIONS, canPerformAction, canPerformAnyAction } from "@/lib/permissions"
import { getPermissions, getSession } from "@/lib/auth/auth-server"
import { UsersTable } from "@/features/admin/users/components/users-table"

interface SessionWithMeta {
  roles?: Array<{ name: string }>
  permissions?: Array<string>
}

/**
 * Users Page
 * 
 * Permission checking cho page access đã được xử lý ở layout level (PermissionGate)
 * Chỉ cần check permissions cho UI actions (canDelete, canRestore, canManage, canCreate)
 */
export default async function UsersPage() {
  const session = (await getSession()) as SessionWithMeta | null
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  // Check permissions cho UI actions (không phải page access)
  const canDelete = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_MANAGE,
  ])
  const canRestore = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_MANAGE,
  ])
  const canManage = canPerformAction(permissions, roles, PERMISSIONS.USERS_MANAGE)
  const canCreate = canPerformAction(permissions, roles, PERMISSIONS.USERS_CREATE)

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Users", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <UsersTable
          canDelete={canDelete}
          canRestore={canRestore}
          canManage={canManage}
          canCreate={canCreate}
        />
      </div>
    </>
  )
}
```

**Pattern 2: Detail Page (fetch data để check not found)**

```typescript
// src/app/admin/users/[id]/page.tsx
import { AdminHeader } from "@/components/headers"
import { UserDetail } from "@/features/admin/users/components/user-detail"
import { getUserDetailById } from "@/features/admin/users/server/cache"

/**
 * User Detail Page (Server Component)
 * 
 * Permission checking cho page access đã được xử lý ở layout level (PermissionGate)
 * Route này yêu cầu USERS_VIEW permission (được map trong route-permissions.ts)
 * 
 * Pattern: Page fetches data -> UserDetail (server) -> UserDetailClient (client)
 */
export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getUserDetailById(id)

  if (!user) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Users", href: "/admin/users" },
            { label: "Chi tiết", href: `/admin/users/${id}` },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">Không tìm thấy người dùng</h2>
              <p className="text-muted-foreground">
                Người dùng bạn đang tìm kiếm không tồn tại.
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }
  
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Users", href: "/admin/users" },
          { label: "Chi tiết", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* UserDetail là server component, tự fetch data và render client component */}
        <UserDetail userId={id} backUrl="/admin/users" />
      </div>
    </>
  )
}
```

**Pattern 3: Edit Page (fetch data để check not found)**

```typescript
// src/app/admin/users/[id]/edit/page.tsx
import { AdminHeader } from "@/components/headers"
import { UserEdit } from "@/features/admin/users/components/user-edit"
import { getUserDetailById } from "@/features/admin/users/server/cache"

/**
 * User Edit Page
 * 
 * Permission checking cho page access đã được xử lý ở layout level (PermissionGate)
 * Route này yêu cầu USERS_UPDATE permission (được map trong route-permissions.ts)
 */
export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getUserDetailById(id)

  if (!user) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Users", href: "/admin/users" },
            { label: "Chi tiết", href: `/admin/users/${id}` },
            { label: "Chỉnh sửa", isActive: true },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">Không tìm thấy người dùng</h2>
              <p className="text-muted-foreground">
                Người dùng bạn đang tìm kiếm không tồn tại.
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Users", href: "/admin/users" },
          { label: "Chi tiết", href: `/admin/users/${id}` },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <UserEdit
          userId={id}
          variant="page"
          backUrl={`/admin/users/${id}`}
          backLabel="Quay lại chi tiết"
        />
      </div>
    </>
  )
}
```

**Pattern 4: Create Page (không cần fetch data)**

```typescript
// src/app/admin/users/new/page.tsx
import { AdminHeader } from "@/components/headers"
import { UserCreate } from "@/features/admin/users/components/user-create"

/**
 * User Create Page
 * 
 * Permission checking cho page access đã được xử lý ở layout level (PermissionGate)
 * Route này yêu cầu USERS_CREATE permission (được map trong route-permissions.ts)
 */
export default async function UserCreatePage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Users", href: "/admin/users" },
          { label: "Tạo mới", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <UserCreate backUrl="/admin/users" />
      </div>
    </>
  )
}
```

#### API Routes

**Quy tắc:**
- ✅ Sử dụng `api-route-wrapper` để handle authentication và permissions
- ✅ Import mutations từ `features/*/server/mutations`
- ✅ Validate input và return proper error responses
- ✅ Không chứa business logic (logic nằm trong mutations)

**Ví dụ:**

```typescript
// src/app/api/admin/users/route.ts
/**
 * API Route: GET /api/admin/users - List users
 * POST /api/admin/users - Create user
 */
import { NextRequest, NextResponse } from "next/server"
import { listUsersCached } from "@/features/admin/users/server/cache"
import {
  createUser,
  type AuthContext,
  type CreateUserInput,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/users/server/mutations"
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validatePagination, sanitizeSearchQuery } from "@/lib/api/validation"

async function getUsersHandler(req: NextRequest, _context: ApiRouteContext) {
  const searchParams = req.nextUrl.searchParams

  const paginationValidation = validatePagination({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  })

  if (!paginationValidation.valid) {
    return NextResponse.json({ error: paginationValidation.error }, { status: 400 })
  }

  const searchValidation = sanitizeSearchQuery(searchParams.get("search") || "", 200)
  const statusParam = searchParams.get("status") || "active"
  const status = statusParam === "deleted" || statusParam === "all" ? statusParam : "active"

  const columnFilters: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key.startsWith("filter[")) {
      const columnKey = key.replace("filter[", "").replace("]", "")
      const sanitizedValue = sanitizeSearchQuery(value, 100)
      if (sanitizedValue.valid && sanitizedValue.value) {
        columnFilters[columnKey] = sanitizedValue.value
      }
    }
  })

  const activeFilters = Object.keys(columnFilters).length > 0 ? columnFilters : undefined
  const filtersKey = activeFilters ? JSON.stringify(activeFilters) : ""
  const result = await listUsersCached(
    paginationValidation.page!,
    paginationValidation.limit!,
    searchValidation.value || "",
    filtersKey,
    status
  )

  return NextResponse.json(result)
}

async function postUsersHandler(req: NextRequest, context: ApiRouteContext) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const user = await createUser(ctx, body as unknown as CreateUserInput)
    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể tạo người dùng" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi tạo người dùng" }, { status: 500 })
  }
}

export const GET = createGetRoute(getUsersHandler)
export const POST = createPostRoute(postUsersHandler)
```

### 2. Features (`src/features/`)

Chứa **business logic**, **components**, và **server functions** cho từng feature.

```
src/features/admin/users/
├── components/
│   ├── index.ts                       # Export barrel (Server + Client components + types)
│   ├── users-table.tsx                # Server Component (fetch data + roles)
│   ├── users-table.client.tsx         # Client Component (UI/interactions, DataTable)
│   ├── user-detail.tsx                # Server Component (fetch data)
│   ├── user-detail.client.tsx         # Client Component (UI/interactions, animations)
│   ├── user-create.tsx                # Server Component (fetch roles)
│   ├── user-create.client.tsx         # Client Component (form)
│   ├── user-edit.tsx                  # Server Component (fetch data + roles)
│   └── user-edit.client.tsx           # Client Component (form)
├── server/
│   ├── index.ts                       # Export barrel (queries, cache, mutations, helpers, notifications)
│   ├── queries.ts                     # Non-cached database queries (dùng trong API routes)
│   ├── cache.ts                       # Cached queries với React cache() (dùng trong Server Components)
│   ├── mutations.ts                   # Create, update, delete operations với permission checks
│   ├── helpers.ts                     # Helper functions (serialization, mapping, transformation)
│   └── notifications.ts               # Realtime notifications via Socket.IO
├── hooks/
│   ├── index.ts                       # Export barrel
│   └── use-roles.ts                   # Custom hooks (client-side)
├── types.ts                           # Type definitions cho feature (UserRow, UsersTableClientProps, etc.)
├── form-fields.ts                     # Form field definitions (reusable cho create/edit)
└── utils.ts                           # Utility functions (validation, formatting, normalization)
```

**Lưu ý:** Cấu trúc này là pattern chuẩn cho tất cả các features trong admin. Mỗi feature sẽ có cấu trúc tương tự.

#### Components

**Quy tắc:**
- ✅ **Server Components** (`*.tsx`): Fetch data và pass xuống client
- ✅ **Client Components** (`*.client.tsx`): Handle UI, interactions, forms
- ✅ Pattern: Server Component → Client Component
- ✅ Server components không có `"use client"` directive
- ✅ Client components có `"use client"` directive ở đầu file

**Ví dụ Server Component:**

```typescript
// src/features/admin/users/components/users-table.tsx
/**
 * Server Component: Users Table
 * 
 * Fetches initial data và roles, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */
import { listUsersCached, getRolesCached } from "../server/cache"
import { serializeUsersList } from "../server/helpers"
import { UsersTableClient } from "./users-table.client"

export interface UsersTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
}

export async function UsersTable({ canDelete, canRestore, canManage, canCreate }: UsersTableProps) {
  // Fetch initial data và roles với cached queries (tự động deduplicate)
  const [usersData, roles] = await Promise.all([
    listUsersCached(1, 10, "", "", "active"),
    getRolesCached(),
  ])

  // Serialize data trước khi pass xuống client component
  return (
    <UsersTableClient
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
      initialData={serializeUsersList(usersData)}
      initialRolesOptions={roles.map((role) => ({
        label: role.displayName,
        value: role.name,
      }))}
    />
  )
}
```

**Ví dụ Client Component:**

```typescript
// src/features/admin/users/components/users-table.client.tsx
"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ResourceTableClient } from "@/features/admin/resources/components/resource-table.client"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import type { UserRow, UsersTableClientProps } from "../types"

export function UsersTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  initialData,
  initialRolesOptions = [],
}: UsersTableClientProps) {
  const router = useRouter()
  
  // Loader function để fetch data khi user tương tác (pagination, filter, etc.)
  const loader = useCallback(async (query) => {
    const params = new URLSearchParams({
      page: String(query.page),
      limit: String(query.limit),
    })

    if (query.search.trim()) {
      params.set("search", query.search.trim())
    }

    Object.entries(query.filters).forEach(([key, value]) => {
      if (value) params.set(`filter[${key}]`, value)
    })

    const response = await apiClient.get(`${apiRoutes.users.list}?${params}`)
    return response.data
  }, [])

  return (
    <ResourceTableClient
      loader={loader}
      initialData={initialData} // Server-side bootstrap data
      // ... other props
    />
  )
}
```

#### Server Functions

**Quy tắc:**
- ✅ **`queries.ts`**: Non-cached database queries (dùng trong API routes)
- ✅ **`cache.ts`**: Cached queries với React `cache()` (dùng trong Server Components)
- ✅ **`mutations.ts`**: Create, update, delete operations với permission checks
- ✅ **`helpers.ts`**: Helper functions (serialization, mapping, transformation)
- ✅ **`notifications.ts`**: Realtime notifications via Socket.IO cho các actions (create, update, delete, etc.)

**Ví dụ queries.ts:**

```typescript
// src/features/admin/users/server/queries.ts
/**
 * Non-cached Database Queries for Users
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */
import { prisma } from "@/lib/database"
import { validatePagination, buildPagination, type ResourcePagination } from "@/features/admin/resources/server"
import { mapUserRecord, buildWhereClause } from "./helpers"

export interface ListUsersInput {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string>
  status?: "active" | "deleted" | "all"
}

export interface ListedUser {
  id: string
  email: string
  name: string | null
  avatar: string | null
  isActive: boolean
  createdAt: Date
  deletedAt: Date | null
  roles: Array<{
    id: string
    name: string
    displayName: string
  }>
}

export interface ListUsersResult {
  data: ListedUser[]
  pagination: ResourcePagination
}

export async function listUsers(params: ListUsersInput = {}): Promise<ListUsersResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  return {
    data: users.map(mapUserRecord),
    pagination: buildPagination(page, limit, total),
  }
}
```

**Ví dụ cache.ts:**

```typescript
// src/features/admin/users/server/cache.ts
/**
 * Cache Functions for Users
 * 
 * Sử dụng React cache() để:
 * - Tự động deduplicate requests trong cùng một render pass
 * - Cache kết quả để tái sử dụng
 * - Cải thiện performance với request deduplication
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */
import { cache } from "react"
import { listUsers, type UserDetail } from "./queries"
import { mapUserRecord } from "./helpers"
import { prisma } from "@/lib/database"

/**
 * Cache function: List users with pagination
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 */
export const listUsersCached = cache(
  async (page: number, limit: number, search: string, filtersKey: string, status: string) => {
    const filters = filtersKey ? (JSON.parse(filtersKey) as Record<string, string>) : undefined
    const parsedStatus = status === "deleted" || status === "all" ? status : "active"
    return listUsers({
      page,
      limit,
      search: search || undefined,
      filters,
      status: parsedStatus,
    })
  },
)

/**
 * Cache function: Get user detail by ID
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 */
export const getUserDetailById = cache(async (id: string): Promise<UserDetail | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  })

  if (!user) return null

  return {
    ...mapUserRecord(user),
    bio: user.bio,
    phone: user.phone,
    address: user.address,
    emailVerified: user.emailVerified,
    updatedAt: user.updatedAt,
  }
})

/**
 * Cache function: Get all roles
 */
export const getRolesCached = cache(async () => {
  return prisma.role.findMany({
    where: { isActive: true },
    orderBy: { displayName: "asc" },
  })
})
```

**Ví dụ mutations.ts:**

```typescript
// src/features/admin/users/server/mutations.ts
import bcrypt from "bcryptjs"
import type { Permission } from "@/lib/permissions"
import { PERMISSIONS, canPerformAction, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { mapUserRecord, type ListedUser, type UserWithRoles } from "./queries"
import { notifySuperAdminsOfUserAction } from "./notifications"

export interface AuthContext {
  actorId: string
  permissions: Permission[]
  roles: Array<{ name: string }>
}

export class ApplicationError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "Forbidden") {
    super(message, 403)
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = "Not found") {
    super(message, 404)
  }
}

export interface CreateUserInput {
  email: string
  password: string
  name?: string | null
  roleIds?: string[]
  isActive?: boolean
  bio?: string | null
  phone?: string | null
  address?: string | null
}

function ensurePermission(ctx: AuthContext, ...required: Permission[]) {
  const allowed = required.some((perm) => canPerformAction(ctx.permissions, ctx.roles, perm))
  if (!allowed) {
    throw new ForbiddenError()
  }
}

export async function createUser(ctx: AuthContext, input: CreateUserInput): Promise<ListedUser> {
  ensurePermission(ctx, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_MANAGE)

  if (!input.email || !input.password) {
    throw new ApplicationError("Email và mật khẩu là bắt buộc", 400)
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) {
    throw new ApplicationError("Email đã tồn tại", 400)
  }

  const passwordHash = await bcrypt.hash(input.password, 10)

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      password: passwordHash,
      name: input.name || null,
      isActive: input.isActive ?? true,
      bio: input.bio || null,
      phone: input.phone || null,
      address: input.address || null,
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  })

  // Assign roles if provided
  if (input.roleIds && input.roleIds.length > 0) {
    await prisma.userRole.createMany({
      data: input.roleIds.map((roleId) => ({
        userId: user.id,
        roleId,
      })),
    })
  }

  // Emit notification realtime
  await notifySuperAdminsOfUserAction(
    "create",
    ctx.actorId,
    {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  )

  return mapUserRecord(user)
}
```

**Ví dụ notifications.ts:**

```typescript
// src/features/admin/users/server/notifications.ts
import { prisma } from "@/lib/database"
import { getSocketServer, storeNotificationInCache, mapNotificationToPayload } from "@/lib/socket/state"
import { createNotificationForSuperAdmins } from "@/features/admin/notifications/server/mutations"
import { NotificationKind } from "@prisma/client"

/**
 * Helper function để tạo system notification cho super admin về user actions
 */
export async function notifySuperAdminsOfUserAction(
  action: "create" | "update" | "delete" | "restore" | "hard-delete",
  actorId: string,
  targetUser: { id: string; email: string; name: string | null },
  changes?: {
    email?: { old: string; new: string }
    isActive?: { old: boolean; new: boolean }
    roles?: { old: string[]; new: string[] }
  }
) {
  try {
    // 1. Lấy thông tin actor và format notification
    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"
    const targetUserName = targetUser.name || targetUser.email
    
    let title = ""
    let description = ""
    const actionUrl = `/admin/users/${targetUser.id}`
    
    // Format title và description dựa trên action
    switch (action) {
      case "create":
        title = "👤 Người dùng mới được tạo"
        description = `${actorName} đã tạo người dùng mới: ${targetUserName} (${targetUser.email})`
        break
      case "update":
        // Format changes...
        title = "✏️ Người dùng được cập nhật"
        description = `${actorName} đã cập nhật người dùng: ${targetUserName} (${targetUser.email})`
        break
      // ... other cases
    }
    
    // 2. Tạo notification trong database cho tất cả super admins
    const result = await createNotificationForSuperAdmins(
      title,
      description,
      actionUrl,
      NotificationKind.SYSTEM,
      {
        type: `user_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        targetUserId: targetUser.id,
        targetUserName,
        targetUserEmail: targetUser.email,
        changes,
        timestamp: new Date().toISOString(),
      }
    )
    
    // 3. Emit socket event với notifications từ database (IDs thực tế)
    const io = getSocketServer()
    if (io && result.count > 0) {
      // Lấy danh sách super admins
      const superAdmins = await prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          userRoles: {
            some: {
              role: {
                name: "super_admin",
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
        select: { id: true },
      })
      
      // Fetch notifications vừa tạo để lấy IDs thực tế
      const createdNotifications = await prisma.notification.findMany({
        where: {
          title,
          description,
          actionUrl,
          kind: NotificationKind.SYSTEM,
          userId: { in: superAdmins.map((a) => a.id) },
          createdAt: { gte: new Date(Date.now() - 5000) },
        },
        orderBy: { createdAt: "desc" },
        take: superAdmins.length,
      })
      
      // Emit to each super admin với notification từ database
      for (const admin of superAdmins) {
        const dbNotification = createdNotifications.find((n) => n.userId === admin.id)
        if (dbNotification) {
          const socketNotification = mapNotificationToPayload(dbNotification)
          storeNotificationInCache(admin.id, socketNotification)
          io.to(`user:${admin.id}`).emit("notification:new", socketNotification)
        } else {
          // Fallback nếu không tìm thấy notification trong database
          const fallbackNotification = {
            id: `user-${action}-${targetUser.id}-${Date.now()}`,
            kind: "system" as const,
            title,
            description,
            actionUrl,
            timestamp: Date.now(),
            read: false,
            toUserId: admin.id,
            metadata: {
              type: `user_${action}`,
              actorId,
              targetUserId: targetUser.id,
            },
          }
          storeNotificationInCache(admin.id, fallbackNotification)
          io.to(`user:${admin.id}`).emit("notification:new", fallbackNotification)
        }
      }
      
      // Also emit to role room for broadcast
      if (createdNotifications.length > 0) {
        const roleNotification = mapNotificationToPayload(createdNotifications[0])
        io.to("role:super_admin").emit("notification:new", roleNotification)
      }
    }
  } catch (error) {
    // Log error nhưng không throw để không ảnh hưởng đến main operation
    console.error("[notifications] Failed to notify super admins:", error)
  }
}
```

**Quy tắc:**
- ✅ Tách riêng logic notifications vào file `notifications.ts`
- ✅ Tạo notification trong database trước (với `createNotificationForSuperAdmins`)
- ✅ Fetch notifications từ database để lấy IDs thực tế (trong vòng 5 giây)
- ✅ Sử dụng `mapNotificationToPayload` để convert từ database sang socket format
- ✅ Sử dụng `storeNotificationInCache` để lưu vào cache
- ✅ Emit đến từng user room với `toUserId` và `user:${adminId}` room
- ✅ Có fallback nếu không tìm thấy notification trong database
- ✅ Emit đến role room (`role:super_admin`) cho broadcast
- ✅ Không throw error để không ảnh hưởng đến main operation
- ✅ Sử dụng emoji trong titles để dễ nhận biết (👤, ✏️, 🗑️, ♻️, ⚠️)

**Ví dụ helpers.ts:**

```typescript
// src/features/admin/users/server/helpers.ts
import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import { serializeDate } from "@/features/admin/resources/server"
import type { ListUsersInput, ListedUser, UserDetail, ListUsersResult } from "./queries"
import type { UserRow } from "../types"

type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: {
          select: {
            id: true
            name: true
            displayName: true
          }
        }
      }
    }
  }
}>

/**
 * Map Prisma user record to ListedUser format
 */
export function mapUserRecord(user: UserWithRoles): ListedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    isActive: user.isActive,
    createdAt: user.createdAt,
    deletedAt: user.deletedAt,
    roles: user.userRoles.map((ur) => ur.role),
  }
}

/**
 * Build Prisma where clause from ListUsersInput
 */
export function buildWhereClause(params: ListUsersInput): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {}
  const status = params.status ?? "active"

  if (status === "active") {
    where.deletedAt = null
  } else if (status === "deleted") {
    where.deletedAt = { not: null }
  }

  if (params.search) {
    const searchValue = params.search.trim()
    if (searchValue.length > 0) {
      where.OR = [
        { email: { contains: searchValue, mode: "insensitive" } },
        { name: { contains: searchValue, mode: "insensitive" } },
      ]
    }
  }

  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = rawValue?.trim()
      if (!value) continue

      switch (key) {
        case "email":
          where.email = { contains: value, mode: "insensitive" }
          break
        case "name":
          where.name = { contains: value, mode: "insensitive" }
          break
        case "isActive":
          where.isActive = value === "true"
          break
        // ... more filters
      }
    }
  }

  return where
}

/**
 * Serialize UserDetail to client format (dates → strings)
 */
export function serializeUserDetail(user: UserDetail) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    bio: user.bio,
    phone: user.phone,
    address: user.address,
    isActive: user.isActive,
    createdAt: serializeDate(user.createdAt)!,
    updatedAt: serializeDate(user.updatedAt)!,
    deletedAt: serializeDate(user.deletedAt),
    emailVerified: serializeDate(user.emailVerified),
    roles: user.roles,
  }
}

/**
 * Serialize user for table row format
 */
export function serializeUserForTable(user: ListedUser): UserRow {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    createdAt: serializeDate(user.createdAt)!,
    deletedAt: serializeDate(user.deletedAt),
    roles: user.roles,
  }
}

/**
 * Serialize ListUsersResult to DataTable format
 */
export function serializeUsersList(data: ListUsersResult): DataTableResult<UserRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map(serializeUserForTable),
  }
}
```

#### Types, Utils, Form Fields

**Quy tắc:**
- ✅ **`types.ts`**: Type definitions cho feature
- ✅ **`utils.ts`**: Utility functions (validation, formatting)
- ✅ **`form-fields.ts`**: Form field definitions (reusable cho create/edit)

**Ví dụ types.ts:**

```typescript
// src/features/admin/users/types.ts
import type { Role } from "./utils"
import type { ResourceResponse, BaseResourceTableClientProps } from "@/features/admin/resources/types"

export type UserRole = Role

export interface UserRow {
  id: string
  email: string
  name: string | null
  isActive: boolean
  createdAt: string
  deletedAt: string | null
  roles: UserRole[]
}

export interface UsersTableClientProps extends BaseResourceTableClientProps<UserRow> {
  initialRolesOptions?: Array<{ label: string; value: string }>
}

export type UsersResponse = ResourceResponse<UserRow>
```

**Ví dụ utils.ts:**

```typescript
// src/features/admin/users/utils.ts
/**
 * Shared utility functions và validation cho user forms
 */

export interface Role {
  id: string
  name: string
  displayName: string
}

/**
 * Normalize roleIds từ single value hoặc array thành array
 */
export function normalizeRoleIds(roleIds: unknown): string[] {
  if (roleIds === undefined || roleIds === null || roleIds === "") {
    return []
  }
  if (Array.isArray(roleIds)) {
    return roleIds.filter((id): id is string => typeof id === "string" && id !== "")
  }
  if (typeof roleIds === "string" && roleIds !== "") {
    return [roleIds]
  }
  return []
}

/**
 * Validate email format
 */
export function validateEmail(value: unknown): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (typeof value !== "string" || !emailRegex.test(value)) {
    return { valid: false, error: "Email không hợp lệ" }
  }
  return { valid: true }
}

/**
 * Validate name (minimum 2 characters)
 */
export function validateName(value: unknown): { valid: boolean; error?: string } {
  if (value && typeof value === "string" && value.trim().length < 2) {
    return { valid: false, error: "Tên phải có ít nhất 2 ký tự" }
  }
  return { valid: true }
}

/**
 * Validate password (minimum 6 characters, empty allowed for edit)
 */
export function validatePassword(value: unknown, allowEmpty = false): { valid: boolean; error?: string } {
  if (allowEmpty && (!value || value === "")) {
    return { valid: true }
  }
  if (!value || value === "" || typeof value !== "string") {
    return { valid: false, error: "Mật khẩu là bắt buộc" }
  }
  if (value.length < 6) {
    return { valid: false, error: "Mật khẩu phải có ít nhất 6 ký tự" }
  }
  return { valid: true }
}

/**
 * Format date to Vietnamese locale
 */
export function formatDateVi(date: string | Date): string {
  return new Date(date).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Get user initials from name or email
 */
export function getUserInitials(name?: string | null, email?: string): string {
  if (name) {
    const parts = name.trim().split(" ")
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase()
  }
  return email ? email.substring(0, 2).toUpperCase() : "U"
}
```

**Ví dụ form-fields.ts:**

```typescript
// src/features/admin/users/form-fields.ts
/**
 * Shared form field definitions cho user forms
 */
import type { ResourceFormField, ResourceFormSection } from "@/features/admin/resources/components"
import { validateEmail, validateName, validatePassword } from "./utils"
import type { Role } from "./utils"
import React from "react"
import { Mail, User, Shield, AlignLeft, Phone, MapPin, ToggleLeft, Lock } from "lucide-react"

export interface UserFormData {
  email: string
  name?: string | null
  roleIds?: string[] | string
  isActive?: boolean
  bio?: string | null
  phone?: string | null
  address?: string | null
  password?: string
  [key: string]: unknown
}

/**
 * Sections cho user form
 */
export function getUserFormSections(): ResourceFormSection[] {
  return [
    {
      id: "login",
      title: "Thông tin đăng nhập",
      description: "Thông tin dùng để đăng nhập vào hệ thống",
    },
    {
      id: "personal",
      title: "Thông tin cá nhân",
      description: "Thông tin cá nhân của người dùng",
    },
    {
      id: "additional",
      title: "Thông tin bổ sung",
      description: "Các thông tin bổ sung về người dùng",
    },
    {
      id: "access",
      title: "Vai trò & Trạng thái",
      description: "Cấu hình quyền truy cập và trạng thái hoạt động",
    },
  ]
}

/**
 * Base fields cho user form (email, name, roles, isActive, bio, phone, address)
 */
export function getBaseUserFields(roles: Role[], roleDefaultValue = ""): ResourceFormField<UserFormData>[] {
  return [
    {
      name: "email",
      label: "Email",
      type: "email",
      placeholder: "email@example.com",
      required: true,
      validate: validateEmail,
      icon: React.createElement(Mail, { className: "h-4 w-4" }),
      section: "login",
    },
    {
      name: "name",
      label: "Tên",
      type: "text",
      placeholder: "Nhập tên",
      validate: validateName,
      icon: React.createElement(User, { className: "h-4 w-4" }),
      section: "personal",
    },
    {
      name: "phone",
      label: "Số điện thoại",
      type: "text",
      placeholder: "Nhập số điện thoại",
      icon: React.createElement(Phone, { className: "h-4 w-4" }),
      section: "personal",
    },
    {
      name: "bio",
      label: "Giới thiệu",
      type: "textarea",
      placeholder: "Nhập giới thiệu về người dùng",
      icon: React.createElement(AlignLeft, { className: "h-4 w-4" }),
      section: "additional",
    },
    {
      name: "address",
      label: "Địa chỉ",
      type: "textarea",
      placeholder: "Nhập địa chỉ",
      icon: React.createElement(MapPin, { className: "h-4 w-4" }),
      section: "additional",
    },
    {
      name: "roleIds",
      label: "Vai trò",
      type: "select",
      required: false,
      placeholder: "Chọn vai trò",
      options: roles.map((role) => ({
        label: role.displayName || role.name,
        value: role.id,
      })),
      defaultValue: roleDefaultValue,
      icon: React.createElement(Shield, { className: "h-4 w-4" }),
      section: "access",
    },
    {
      name: "isActive",
      label: "Trạng thái",
      description: "Bật/tắt để kích hoạt hoặc vô hiệu hóa người dùng",
      type: "switch",
      defaultValue: true,
      icon: React.createElement(ToggleLeft, { className: "h-4 w-4" }),
      section: "access",
    }
  ]
}

/**
 * Password field cho create form
 */
export function getPasswordField(): ResourceFormField<UserFormData> {
  return {
    name: "password",
    label: "Mật khẩu",
    type: "password",
    placeholder: "Nhập mật khẩu",
    required: true,
    description: "Mật khẩu phải có ít nhất 6 ký tự",
    validate: (value) => validatePassword(value, false),
    icon: React.createElement(Lock, { className: "h-4 w-4" }),
    section: "login",
  }
}

/**
 * Password field cho edit form (optional, only for super admin)
 */
export function getPasswordEditField(): ResourceFormField<UserFormData> {
  return {
    name: "password",
    label: "Mật khẩu mới",
    type: "password",
    placeholder: "Để trống nếu không muốn thay đổi",
    description: "Chỉ nhập nếu muốn thay đổi mật khẩu. Để trống để giữ nguyên mật khẩu hiện tại.",
    required: false,
    validate: (value) => validatePassword(value, true),
    icon: React.createElement(Lock, { className: "h-4 w-4" }),
    section: "login",
  }
}
```

### 3. Shared Components (`src/components/`)

Chứa **reusable UI components** được dùng chung trong toàn bộ ứng dụng.

```
src/components/
├── ui/                                # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   └── ...
├── forms/                             # Form components
├── dialogs/                           # Dialog components
├── headers/                           # Header components
├── navigation/                        # Navigation components
└── shared/                            # Shared components
```

**Quy tắc:**
- ✅ Chỉ chứa UI components, không có business logic
- ✅ Có thể là Server hoặc Client Components tùy nhu cầu
- ✅ Reusable và generic

### 4. Lib (`src/lib/`)

Chứa **utilities**, **configs**, và **helpers** được dùng chung.

```
src/lib/
├── api/                               # API utilities
│   ├── api-route-wrapper.ts          # API route wrapper
│   ├── routes.ts                      # API routes config
│   ├── client.tsx                     # API client
│   └── validation.ts                  # Validation helpers
├── auth/                              # Authentication
├── permissions/                       # Permissions system
├── database/                          # Database (Prisma)
├── query-keys.ts                      # Query keys config
└── utils/                             # General utilities
```

## 🔄 Data Flow

### Pattern: Page → Server Component → Client Component

```
1. Page (Server Component)
   └──> Fetch permissions
   └──> Render feature Server Component

2. Feature Server Component
   └──> Fetch data với cached queries
   └──> Serialize data
   └──> Pass xuống Client Component

3. Feature Client Component
   └──> Render UI
   └──> Handle interactions
   └──> Call API routes khi cần
```

### Pattern: API Route → Mutation

```
1. API Route Handler
   └──> Validate input
   └──> Build AuthContext
   └──> Call mutation

2. Mutation
   └──> Check permissions
   └──> Validate business rules
   └──> Execute database operations
   └──> Return result
```

## 📝 Quy tắc và Best Practices

### ✅ DO

1. **Tách biệt rõ ràng Server và Client Components**
   - Server Components: Fetch data, không có `"use client"`
   - Client Components: UI/interactions, có `"use client"`

2. **Sử dụng cached queries trong Server Components**
   - Dùng `cache.ts` với React `cache()` cho Server Components
   - Dùng `queries.ts` (non-cached) cho API routes

3. **Tập trung business logic trong mutations**
   - Permission checks
   - Validation
   - Database operations
   - Realtime notifications (gọi từ `notifications.ts`)

4. **Serialize data trước khi pass xuống Client**
   - Dates → strings
   - Complex objects → simple objects
   - Sử dụng helpers trong `server/helpers.ts`

5. **Sử dụng barrel exports (`index.ts`)**
   - Dễ import và maintain
   - Clean imports

### ❌ DON'T

1. **KHÔNG fetch data trong Client Component useEffect**
   ```typescript
   // ❌ BAD
   "use client"
   useEffect(() => {
     apiClient.get("/users").then(setUsers)
   }, [])
   
   // ✅ GOOD
   // Server Component fetch data và pass xuống
   ```

2. **KHÔNG mix server và client logic**
   ```typescript
   // ❌ BAD
   export async function UserDetail({ userId }) {
     const user = await getUser(userId)
     const router = useRouter() // ❌ Cannot use hooks
   }
   ```

3. **KHÔNG đặt business logic trong API routes**
   ```typescript
   // ❌ BAD
   export async function POST(req) {
     // Business logic here
     await prisma.user.create({ ... })
   }
   
   // ✅ GOOD
   export async function POST(req) {
     const user = await createUser(ctx, input)
   }
   ```

4. **KHÔNG hardcode URLs hoặc query keys**
   ```typescript
   // ❌ BAD
   await apiClient.get(`/api/admin/users/${id}`)
   
   // ✅ GOOD
   await apiClient.get(apiRoutes.users.detail(id))
   ```

## 🎯 Naming Conventions

### Files

- **Server Components**: `users-table.tsx`, `user-detail.tsx`
- **Client Components**: `users-table.client.tsx`, `user-detail.client.tsx`
- **Server Functions**: `queries.ts`, `mutations.ts`, `cache.ts`, `helpers.ts`
- **Types**: `types.ts`
- **Utils**: `utils.ts`, `form-fields.ts`

### Functions

- **Queries**: `listUsers()`, `getUserById()`
- **Cached Queries**: `listUsersCached()`, `getUserDetailById()`
- **Mutations**: `createUser()`, `updateUser()`, `deleteUser()`
- **Helpers**: `serializeUserDetail()`, `buildWhereClause()`, `mapUserRecord()`

## 📚 Ví dụ thực tế: Users Feature

### Cấu trúc hoàn chỉnh (Users Feature - Reference Implementation)

```
src/
├── app/
│   ├── admin/users/
│   │   ├── page.tsx                    # List page (check permissions)
│   │   ├── [id]/
│   │   │   ├── page.tsx                # Detail page (fetch data, check not found)
│   │   │   └── edit/
│   │   │       └── page.tsx            # Edit page (fetch data, check not found)
│   │   └── new/
│   │       └── page.tsx                 # Create page (không fetch data)
│   └── api/admin/users/
│       ├── route.ts                    # GET (list), POST (create)
│       ├── [id]/
│       │   ├── route.ts                # GET, PUT, DELETE
│       │   ├── restore/
│       │   │   └── route.ts            # POST (restore)
│       │   └── hard-delete/
│       │       └── route.ts            # DELETE (hard delete)
│       └── bulk/
│           └── route.ts                # POST (bulk operations)
└── features/admin/users/
    ├── components/
    │   ├── index.ts                     # Export barrel (Server + Client components)
    │   ├── users-table.tsx              # Server: fetch data + roles
    │   ├── users-table.client.tsx       # Client: UI/interactions
    │   ├── user-detail.tsx               # Server: fetch data
    │   ├── user-detail.client.tsx       # Client: UI/interactions
    │   ├── user-create.tsx              # Server: fetch roles
    │   ├── user-create.client.tsx       # Client: form
    │   ├── user-edit.tsx                # Server: fetch data + roles
    │   └── user-edit.client.tsx         # Client: form
    ├── server/
    │   ├── index.ts                     # Export barrel (queries, cache, mutations, helpers, notifications)
    │   ├── queries.ts                   # Non-cached queries (API routes)
    │   ├── cache.ts                      # Cached queries (Server Components)
    │   ├── mutations.ts                  # Create, update, delete với permissions
    │   ├── helpers.ts                    # Serialization, mapping, transformation
    │   └── notifications.ts              # Realtime notifications via Socket.IO
    ├── hooks/
    │   ├── index.ts                     # Export barrel
    │   └── use-roles.ts                  # Custom hooks
    ├── types.ts                         # Type definitions
    ├── form-fields.ts                   # Form field definitions
    └── utils.ts                         # Validation, formatting
```

### Flow Examples

#### Example 1: Create User

```
1. User clicks "Create User" button
   └──> Navigate to /admin/users/new

2. Page (Server Component)
   └──> Render AdminHeader với breadcrumbs
   └──> Render UserCreate component

3. UserCreate (Server Component)
   └──> Fetch roles với getRolesCached() (cached query)
   └──> Pass roles xuống UserCreateClient

4. UserCreateClient (Client Component)
   └──> Render form với roles options
   └──> User fills form and submits

5. Form submission
   └──> Call POST /api/admin/users
   └──> API route validates input
   └──> Build AuthContext (actorId, permissions, roles)
   └──> Call createUser() mutation
   └──> Mutation checks permissions
   └──> Validate business rules
   └──> Create user in database
   └──> Emit realtime notifications to super admins (via Socket.IO)
   └──> Return sanitized user data

6. Success
   └──> Redirect to /admin/users
   └──> Invalidate queries
   └──> Refresh table
```

#### Example 2: View User Detail

```
1. User clicks on user row
   └──> Navigate to /admin/users/[id]

2. Page (Server Component)
   └──> Fetch user với getUserDetailById() (cached query)
   └──> Check if user exists
   └──> If not found: Render not found UI
   └──> If found: Render AdminHeader + UserDetail component

3. UserDetail (Server Component)
   └──> Fetch user data với getUserDetailById() (cached, deduplicated)
   └──> Serialize data (dates → strings)
   └──> Pass serialized data xuống UserDetailClient

4. UserDetailClient (Client Component)
   └──> Render UI với animations
   └──> Handle interactions (edit, delete buttons)
```

#### Example 3: Update User (via API)

```
1. UserEditClient submits form
   └──> Call PUT /api/admin/users/[id]

2. API Route Handler
   └──> Validate ID
   └──> Parse request body
   └──> Validate input fields
   └──> Build AuthContext
   └──> Call updateUser() mutation

3. Mutation (mutations.ts)
   └──> Check permissions (USERS_UPDATE or USERS_MANAGE)
   └──> Validate user exists
   └──> Validate email format (if provided)
   └──> Validate password strength (if provided)
   └──> Check email uniqueness (if changed)
   └──> Track changes (email, isActive, roles)
   └──> Update user in database (transaction)
   └──> Emit realtime notifications if changes detected (via Socket.IO)
   └──> Return sanitized user data

4. Success
   └──> Return 200 with updated user
   └──> Client invalidates queries
   └──> Refresh UI
```

## 🎓 Tài liệu tham khảo

- [Next.js 16: App Router](https://nextjs.org/docs/app)
- [Next.js 16: Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js 16: Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [React cache() API](https://react.dev/reference/react/cache)

