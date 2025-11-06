# Next.js 16 Component Patterns - Server & Client Components

Tài liệu này mô tả cách tổ chức **Server Components** và **Client Components** theo chuẩn Next.js 16 trong dự án, dựa trên cấu trúc thực tế của feature **Users**.

## 📋 Tổng quan

Next.js 16 hỗ trợ 2 loại components chính:

### 1. **Server Components** (mặc định)
- Chạy trên server, có thể fetch data trực tiếp
- Không có JavaScript bundle
- Có thể sử dụng `async/await`
- Tự động được cache với React `cache()` để deduplicate requests

### 2. **Client Components** (`"use client"`)
- Chạy trên client, có thể sử dụng hooks, event handlers
- Có JavaScript bundle
- Tương tác với browser APIs
- Xử lý user interactions và state management

## 🏗️ Component Patterns

### Pattern: Server Component → Client Component (phổ biến nhất)

```
Page (Server) → Server Component (fetch data với cache) → Client Component (UI/interactions)
```

Đây là pattern phổ biến nhất, được sử dụng cho hầu hết các trường hợp trong dự án.

## 📁 File Structure

### Naming Convention

- **Server Components**: `users-table.tsx`, `user-detail.tsx`, `user-create.tsx`, `user-edit.tsx`
- **Client Components**: `users-table.client.tsx`, `user-detail.client.tsx`, `user-create.client.tsx`, `user-edit.client.tsx`

### Cấu trúc trong Feature

```
src/features/admin/users/
├── components/
│   ├── index.ts                       # Export barrel (Server + Client components)
│   ├── users-table.tsx                # Server Component (fetch data)
│   ├── users-table.client.tsx         # Client Component (UI/interactions)
│   ├── user-detail.tsx                # Server Component (fetch data)
│   ├── user-detail.client.tsx         # Client Component (UI/interactions)
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
│   └── use-roles.ts                   # Custom hooks (client-side)
├── types.ts                           # Type definitions cho feature
├── form-fields.ts                     # Form field definitions (reusable cho create/edit)
└── utils.ts                           # Utility functions (validation, formatting)
```

## 🔄 Data Fetching với Cache

### Tách biệt Queries và Cache

Trong dự án, chúng ta tách biệt **non-cached queries** và **cached queries**:

#### 1. Non-cached Queries (`queries.ts`)

Sử dụng cho API routes hoặc khi cần fresh data:

```typescript
// src/features/admin/users/server/queries.ts
import { prisma } from "@/lib/database"
import { mapUserRecord, buildWhereClause } from "./helpers"

export interface ListUsersInput {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string>
  status?: "active" | "deleted" | "all"
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

#### 2. Cached Queries (`cache.ts`)

Sử dụng cho Server Components với React `cache()`:

```typescript
// src/features/admin/users/server/cache.ts
import { cache } from "react"
import { listUsers, type UserDetail } from "./queries"
import { mapUserRecord } from "./helpers"
import { prisma } from "@/lib/database"

/**
 * Cache function: List users with pagination
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Được gọi từ Server Components
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
 * 
 * @param id - User ID
 * @returns User detail hoặc null nếu không tìm thấy
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

**Lợi ích:**
- ✅ Tự động deduplicate requests trong cùng một render pass
- ✅ Cache kết quả để tái sử dụng
- ✅ Tách biệt rõ ràng cached và non-cached queries
- ✅ Dễ maintain và test

## 📝 Component Examples

### Example 1: User Detail

#### 1. Page (Server Component)

```typescript
// src/app/admin/users/[id]/page.tsx
import { AdminHeader } from "@/components/headers"
import { UserDetail } from "@/features/admin/users/components/user-detail"
import { getUserDetailById } from "@/features/admin/users/server/cache"

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
        <UserDetail userId={id} backUrl="/admin/users" />
      </div>
    </>
  )
}
```

#### 2. Server Component (fetch data)

```typescript
// src/features/admin/users/components/user-detail.tsx
import { getUserDetailById } from "../server/cache"
import { serializeUserDetail } from "../server/helpers"
import { UserDetailClient } from "./user-detail.client"
import type { UserDetailData } from "./user-detail.client"

export interface UserDetailProps {
  userId: string
  backUrl?: string
}

export async function UserDetail({ userId, backUrl = "/admin/users" }: UserDetailProps) {
  // Fetch data trên server với cached query (tự động deduplicate)
  const user = await getUserDetailById(userId)

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Không tìm thấy người dùng</p>
        </div>
      </div>
    )
  }

  // Serialize data trước khi pass xuống client component (dates → strings)
  return (
    <UserDetailClient
      userId={userId}
      user={serializeUserDetail(user) as UserDetailData}
      backUrl={backUrl}
    />
  )
}
```

#### 3. Client Component (UI/interactions)

```typescript
// src/features/admin/users/components/user-detail.client.tsx
"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export interface UserDetailData {
  id: string
  email: string
  name: string | null
  // ... other fields (dates are serialized to strings)
}

export interface UserDetailClientProps {
  userId: string
  user: UserDetailData
  backUrl: string
}

export function UserDetailClient({ userId, user, backUrl }: UserDetailClientProps) {
  const router = useRouter()
  
  // Chỉ xử lý UI, animations, và interactions
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* UI với animations */}
      <div>
        <h1>{user.name || user.email}</h1>
        {/* ... more UI */}
      </div>
      <Button onClick={() => router.push(backUrl)}>Quay lại</Button>
    </motion.div>
  )
}
```

### Example 2: Users Table (List Pattern)

#### Server Component

```typescript
// src/features/admin/users/components/users-table.tsx
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

#### Client Component

```typescript
// src/features/admin/users/components/users-table.client.tsx
"use client"

import { useCallback } from "react"
import { DataTable, type DataTableLoader } from "@/components/tables/data-table"
import { apiClient } from "@/lib/api/axios"

export function UsersTableClient({ initialData, canDelete }: UsersTableClientProps) {
  // Loader function để fetch data khi user tương tác (pagination, filter, etc.)
  const loader: DataTableLoader<UserRow> = useCallback(async (query) => {
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

    const response = await apiClient.get(`/api/admin/users?${params}`)
    return response.data
  }, [])

  return (
    <DataTable
      columns={columns}
      loader={loader}
      initialData={initialData} // Server-side bootstrap data
      // ... other props
    />
  )
}
```

### Example 3: Forms (Server → Client Pattern)

#### User Create

```typescript
// src/features/admin/users/components/user-create.tsx
import { getRolesCached } from "../server/cache"
import { UserCreateClient } from "./user-create.client"

export interface UserCreateProps {
  backUrl?: string
}

export async function UserCreate({ backUrl = "/admin/users" }: UserCreateProps) {
  // Fetch roles với cached query
  const roles = await getRolesCached()

  return <UserCreateClient backUrl={backUrl} roles={roles} />
}
```

```typescript
// src/features/admin/users/components/user-create.client.tsx
"use client"

import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api/axios"

export function UserCreateClient({ backUrl, roles }: UserCreateClientProps) {
  const router = useRouter()
  const form = useForm()

  const onSubmit = async (data: FormData) => {
    await apiClient.post("/api/admin/users", data)
    router.push(backUrl)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

#### User Edit

```typescript
// src/features/admin/users/components/user-edit.tsx
import { getUserDetailById, getRolesCached } from "../server/cache"
import { serializeUserDetail } from "../server/helpers"
import { UserEditClient } from "./user-edit.client"

export interface UserEditProps {
  userId: string
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export async function UserEdit({
  userId,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: UserEditProps) {
  // Fetch user data và roles với cached queries
  const [user, roles] = await Promise.all([
    getUserDetailById(userId),
    getRolesCached(),
  ])

  if (!user) {
    return null
  }

  const userForEdit = {
    ...serializeUserDetail(user),
    roles: user.roles,
  }

  return (
    <UserEditClient
      user={userForEdit}
      variant={variant}
      backUrl={backUrl}
      backLabel={backLabel}
      userId={userId}
      roles={roles}
    />
  )
}
```

## 📝 Quy tắc và Best Practices

### ✅ Server Components (mặc định)

**Sử dụng khi:**
- Fetch data từ database hoặc API
- Truy cập backend resources (file system, environment variables)
- Giữ sensitive information (API keys, tokens)
- Giảm JavaScript bundle size
- Cần request deduplication với `cache()`

**Đặc điểm:**
- ✅ Có thể `async`
- ✅ Có thể gọi `await` trực tiếp
- ✅ Import từ `server/` directory
- ✅ Fetch data với cached queries (`cache.ts`)
- ✅ Serialize data trước khi pass xuống Client Component

**Không thể sử dụng:**
- ❌ React hooks (useState, useEffect, etc.)
- ❌ Browser APIs (window, document, localStorage)
- ❌ Event handlers (onClick, onChange, etc.)
- ❌ State và lifecycle methods

### ✅ Client Components (`"use client"`)

**Sử dụng khi:**
- Cần interactivity (onClick, onChange, etc.)
- Sử dụng hooks (useState, useEffect, useRouter, etc.)
- Sử dụng browser APIs
- Third-party libraries yêu cầu client-side (framer-motion, etc.)
- Forms và form submissions

**Đặc điểm:**
- ✅ Có `"use client"` directive ở đầu file
- ✅ Sử dụng hooks và browser APIs
- ✅ Có event handlers
- ✅ Nhận data từ Server Component (không fetch trực tiếp)

**Không nên:**
- ❌ Fetch data trong `useEffect` (nên nhận từ Server Component)
- ❌ Chứa business logic phức tạp (nên ở mutations)

### 🎯 Naming Convention

- **Server Components**: `user-detail.tsx`, `users-table.tsx`, `user-create.tsx`, `user-edit.tsx`
- **Client Components**: `user-detail.client.tsx`, `users-table.client.tsx`, `user-create.client.tsx`, `user-edit.client.tsx`

### 📦 File Structure

```
features/admin/users/
├── components/
│   ├── index.ts                       # Export barrel (Server + Client components)
│   ├── user-detail.tsx                # Server Component
│   ├── user-detail.client.tsx         # Client Component
│   ├── users-table.tsx                # Server Component
│   ├── users-table.client.tsx         # Client Component
│   ├── user-create.tsx                # Server Component
│   ├── user-create.client.tsx         # Client Component
│   ├── user-edit.tsx                  # Server Component
│   └── user-edit.client.tsx           # Client Component
├── server/
│   ├── index.ts                       # Export barrel (queries, cache, mutations, helpers, notifications)
│   ├── queries.ts                     # Non-cached database queries
│   ├── cache.ts                       # Cached queries (React cache())
│   ├── mutations.ts                   # Create, update, delete operations
│   ├── helpers.ts                     # Helper functions (serialization, mapping)
│   └── notifications.ts               # Realtime notifications via Socket.IO
├── hooks/
│   └── use-roles.ts                   # Custom hooks
├── types.ts                           # Type definitions
├── form-fields.ts                     # Form field definitions
└── utils.ts                           # Utility functions
```

## 🔍 Kiểm tra Component Type

### Server Component
- ✅ Không có `"use client"` directive
- ✅ Có thể `async`
- ✅ Có thể gọi `await` trực tiếp
- ✅ Import từ `server/` directory
- ✅ Fetch data với cached queries (`cache.ts`)
- ✅ Serialize data trước khi pass xuống Client Component

### Client Component
- ✅ Có `"use client"` directive ở đầu file
- ✅ Sử dụng hooks và browser APIs
- ✅ Có event handlers
- ✅ Nhận data từ Server Component (không fetch trực tiếp trong useEffect)

## 🚫 Anti-patterns

### ❌ KHÔNG: Fetch data trong Client Component useEffect

```typescript
// ❌ BAD
"use client"
export function UserDetail({ userId }: { userId: string }) {
  const [user, setUser] = useState(null)
  
  useEffect(() => {
    apiClient.get(`/admin/users/${userId}`).then(setUser)
  }, [userId])
  
  // ...
}
```

```typescript
// ✅ GOOD
export async function UserDetail({ userId }: { userId: string }) {
  const user = await getUserDetailById(userId)
  return <UserDetailClient user={serializeUserDetail(user)} />
}
```

### ❌ KHÔNG: Mix server và client logic

```typescript
// ❌ BAD
export async function UserDetail({ userId }: { userId: string }) {
  const user = await getUserDetailById(userId)
  const router = useRouter() // ❌ Cannot use hooks in server component
  // ...
}
```

### ✅ ĐÚNG: Tách rõ server và client

```typescript
// ✅ GOOD - Server Component
export async function UserDetail({ userId }: { userId: string }) {
  const user = await getUserDetailById(userId)
  return <UserDetailClient user={serializeUserDetail(user)} />
}

// ✅ GOOD - Client Component
"use client"
export function UserDetailClient({ user }: { user: User }) {
  const router = useRouter()
  // ...
}
```

### ❌ KHÔNG: Sử dụng non-cached queries trong Server Components

```typescript
// ❌ BAD
export async function UsersTable() {
  const users = await listUsers({ page: 1, limit: 10 }) // Non-cached
  // ...
}
```

```typescript
// ✅ GOOD
export async function UsersTable() {
  const users = await listUsersCached(1, 10, "", "", "active") // Cached
  // ...
}
```

## 📚 Ví dụ thực tế trong dự án

### Users Feature (Reference Implementation)

**Pages**: `src/app/admin/users/` - Server Components chỉ chứa layout và permission checks

**Components**: `src/features/admin/users/components/` - Server → Client pattern
- `users-table.tsx` (Server): Fetch initial data với `listUsersCached()`
- `users-table.client.tsx` (Client): Handle pagination, filtering, sorting
- `user-detail.tsx` (Server): Fetch user data với `getUserDetailById()`
- `user-detail.client.tsx` (Client): Render UI với animations
- `user-create.tsx` (Server): Fetch roles với `getRolesCached()`
- `user-create.client.tsx` (Client): Form submissions
- `user-edit.tsx` (Server): Fetch user data và roles
- `user-edit.client.tsx` (Client): Form submissions

**Server Functions**:
- `queries.ts`: Non-cached queries (dùng trong API routes)
- `cache.ts`: Cached queries với React `cache()` (dùng trong Server Components)
- `mutations.ts`: Create, update, delete operations với permission checks
- `helpers.ts`: Serialization, mapping, transformation
- `notifications.ts`: Realtime notifications via Socket.IO cho các actions

**Pattern**: Page → Server Component (fetch với cache) → Client Component (UI/interactions)

### Realtime Notifications Pattern

**Cấu trúc:**
- Tách riêng logic notifications vào file `notifications.ts` trong `server/` directory
- Mutations gọi notification functions sau khi thực hiện actions
- Notifications được tạo trong database và emit qua Socket.IO

**Flow:**
1. Mutation thực hiện action (create, update, delete, etc.)
2. Mutation gọi `notifySuperAdminsOfUserAction()` từ `notifications.ts`
3. Notification function:
   - Tạo notifications trong database cho tất cả super admins
   - Fetch notifications vừa tạo để lấy IDs thực tế
   - Map notifications sang socket payload format
   - Store vào cache và emit qua Socket.IO
4. Client nhận socket events và update UI realtime

**Ví dụ:**

```typescript
// src/features/admin/users/server/mutations.ts
import { notifySuperAdminsOfUserAction } from "./notifications"

export async function createUser(ctx: AuthContext, input: CreateUserInput) {
  // ... business logic ...
  
  const user = await prisma.user.create({ ... })
  
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

```typescript
// src/features/admin/users/server/notifications.ts
export async function notifySuperAdminsOfUserAction(
  action: "create" | "update" | "delete" | "restore" | "hard-delete",
  actorId: string,
  targetUser: { id: string; email: string; name: string | null },
  changes?: { ... }
) {
  // 1. Tạo notifications trong database
  const result = await createNotificationForSuperAdmins(...)
  
  // 2. Fetch notifications vừa tạo để lấy IDs thực tế
  const createdNotifications = await prisma.notification.findMany({ ... })
  
  // 3. Emit socket events với notifications từ database
  for (const admin of superAdmins) {
    const dbNotification = createdNotifications.find(...)
    if (dbNotification) {
      const socketNotification = mapNotificationToPayload(dbNotification)
      storeNotificationInCache(admin.id, socketNotification)
      io.to(`user:${admin.id}`).emit("notification:new", socketNotification)
    }
  }
}
```

## 🎓 So sánh Server vs Client Components

| Đặc điểm | Server Component | Client Component |
|----------|------------------|------------------|
| **Directive** | Không có | `"use client"` |
| **Render Location** | Server | Client |
| **JavaScript Bundle** | Không có | Có |
| **Data Fetching** | ✅ Với `cache()` | ⚠️ Qua API (không nên trong useEffect) |
| **Hooks** | ❌ | ✅ |
| **Event Handlers** | ❌ | ✅ |
| **Browser APIs** | ❌ | ✅ |
| **Caching** | ✅ Với `cache()` | ❌ |
| **Request Deduplication** | ✅ Tự động với `cache()` | ❌ |
| **Use Case** | Data fetching, initial render | UI interactions, forms |

## 🎓 Tài liệu tham khảo

- [Next.js 16: Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js 16: Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [React cache() API](https://react.dev/reference/react/cache)
