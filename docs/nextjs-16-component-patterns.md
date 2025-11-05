# Next.js 16 Component Patterns - Cache, Server & Client Components

Tài liệu này mô tả cách tổ chức **Cache Components**, **Server Components** và **Client Components** theo chuẩn Next.js 16 trong dự án.

## 📋 Tổng quan

Next.js 16 hỗ trợ 3 loại components với các đặc điểm khác nhau:

### 1. **Cache Components** (Next.js 16 - Partial Pre-Rendering)
- Sử dụng `use cache` directive
- Cho phép Partial Pre-Rendering (PPR) - render một phần component ngay lập tức
- Cache kết quả render để tăng performance
- Hữu ích cho các component có thể được cache và render sớm

### 2. **Server Components** (mặc định)
- Chạy trên server, có thể fetch data trực tiếp
- Không có JavaScript bundle
- Có thể sử dụng `async/await`
- Tự động được cache với React `cache()`

### 3. **Client Components** (`"use client"`)
- Chạy trên client, có thể sử dụng hooks, event handlers
- Có JavaScript bundle
- Tương tác với browser APIs
- Xử lý user interactions và state management

## 🏗️ Component Patterns

### Pattern 1: Cache Component → Server Component → Client Component

```
Page (Server) → Cache Component (PPR) → Server Component (fetch data) → Client Component (UI/interactions)
```

**Khi nào sử dụng Cache Components:**
- Component có thể được cache và render sớm (static hoặc slow-changing data)
- Component cần Partial Pre-Rendering để cải thiện perceived performance
- Component có thể được pre-rendered nhưng vẫn cần server-side data fetching

### Pattern 2: Server Component → Client Component (phổ biến nhất)

```
Page (Server) → Server Component (fetch data) → Client Component (UI/interactions)
```

Đây là pattern phổ biến nhất, được sử dụng cho hầu hết các trường hợp.

### Ví dụ: User Detail

#### 1. Page (Server Component)
```typescript
// src/app/admin/users/[id]/page.tsx
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <AdminHeader breadcrumbs={[...]} />
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
import { getUserDetailById } from "../server/queries"
import { UserDetailClient } from "./user-detail.client"

export async function UserDetail({ userId, backUrl }: UserDetailProps) {
  // Fetch data trên server với cache
  const user = await getUserDetailById(userId)
  
  if (!user) {
    return <NotFound />
  }
  
  // Transform và pass xuống client component
  const userForDetail = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    // ... serialize dates
  }
  
  return <UserDetailClient userId={userId} user={userForDetail} backUrl={backUrl} />
}
```

#### 3. Client Component (UI/interactions)
```typescript
// src/features/admin/users/components/user-detail.client.tsx
"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

export function UserDetailClient({ userId, user, backUrl }: UserDetailClientProps) {
  const router = useRouter()
  
  // Chỉ xử lý UI, animations, và interactions
  return (
    <div>
      <motion.div animate={{ opacity: 1 }}>
        {/* UI với animations */}
      </motion.div>
      <Button onClick={() => router.push(backUrl)}>Quay lại</Button>
    </div>
  )
}
```

## 🎯 Cache Components (Next.js 16 - PPR)

### Định nghĩa và Sử dụng

Cache Components sử dụng `use cache` directive để enable Partial Pre-Rendering (PPR):

```typescript
// src/features/admin/dashboard/dashboard-stats-cached.tsx
"use cache"

import { cache } from "react"
import { getDashboardStats } from "../server/queries"
import { DashboardStatsClient } from "./dashboard-stats.client"

/**
 * Cache Component: Dashboard Stats
 * 
 * Sử dụng Partial Pre-Rendering (PPR):
 * - Static shell được render ngay lập tức
 * - Dynamic data được fetch và hydrate sau
 * - Kết quả được cache để tái sử dụng
 */
export async function DashboardStatsCached() {
  // Fetch data với cache
  const stats = await getDashboardStatsCached()
  
  return <DashboardStatsClient stats={stats} />
}

// Cache function với React cache()
const getDashboardStatsCached = cache(async () => {
  return await getDashboardStats()
})
```

**Lợi ích của Cache Components:**
- ✅ **Partial Pre-Rendering**: Render static shell ngay, fetch data sau
- ✅ **Improved Perceived Performance**: User thấy UI nhanh hơn
- ✅ **Automatic Caching**: Kết quả được cache tự động
- ✅ **Streaming**: Data được stream khi ready

**Khi nào sử dụng:**
- ✅ Dashboard components với data thay đổi chậm
- ✅ Statistics/analytics components
- ✅ List components với initial data
- ✅ Components có thể benefit từ PPR

**Khi KHÔNG sử dụng:**
- ❌ Components cần real-time data (sử dụng Client Component)
- ❌ Forms và interactive components (sử dụng Client Component)
- ❌ Components với user-specific sensitive data (sử dụng Server Component)

## 🔄 Data Fetching với Cache

### Server Queries với React `cache()`

```typescript
// src/features/admin/users/server/queries.ts
import { cache } from "react"

// Sử dụng cache() để tự động deduplicate requests và cache kết quả
export const getUserDetailById = cache(async (id: string): Promise<UserDetail | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { /* ... */ }
  })
  
  return user ? transformUser(user) : null
})
```

**Lợi ích:**
- ✅ Tự động deduplicate requests trong cùng một render pass
- ✅ Cache kết quả để tái sử dụng
- ✅ Không cần thêm thư viện caching

### Pattern cho List/Table

```typescript
// Server Component
export async function UsersTable({ canDelete, canRestore }: UsersTableProps) {
  // Fetch initial data với cache
  const initial = await listUsersCached(1, 10, "", "", "active")
  const initialData = serializeInitialData(initial)
  
  // Pass xuống client component
  return (
    <UsersTableClient
      initialData={initialData}
      canDelete={canDelete}
      canRestore={canRestore}
    />
  )
}
```

```typescript
// Client Component
"use client"

export function UsersTableClient({ initialData, canDelete }: UsersTableClientProps) {
  // Sử dụng initialData cho lần render đầu
  // Sau đó fetch thêm qua API khi user tương tác (pagination, filter, etc.)
  const loader = useCallback(async (query) => {
    const response = await apiClient.get(`/admin/users?${params}`)
    return response.data
  }, [])
  
  return (
    <ResourceTableClient
      initialDataByView={{ active: initialData }}
      loader={loader}
      // ...
    />
  )
}
```

## 📝 Quy tắc và Best Practices

### ✅ Cache Components (`"use cache"`)

**Sử dụng khi:**
- Component có thể được pre-rendered và cached
- Cần Partial Pre-Rendering để cải thiện perceived performance
- Data thay đổi chậm hoặc có thể được cache
- Component có static shell và dynamic content

**Mark với directive:**
```typescript
"use cache"

export async function CachedComponent() {
  // Fetch data
  const data = await getCachedData()
  return <Component data={data} />
}
```

**Không thể sử dụng:**
- ❌ Real-time data (sử dụng Client Component với polling/websocket)
- ❌ User-specific sensitive data phải fresh (sử dụng Server Component)
- ❌ Interactive components (sử dụng Client Component)

### ✅ Server Components (mặc định)

**Sử dụng khi:**
- Fetch data từ database hoặc API
- Truy cập backend resources (file system, environment variables)
- Giữ sensitive information (API keys, tokens)
- Giảm JavaScript bundle size

**Không thể sử dụng:**
- ❌ React hooks (useState, useEffect, etc.)
- ❌ Browser APIs (window, document, localStorage)
- ❌ Event handlers (onClick, onChange, etc.)
- ❌ State và lifecycle methods

### ✅ Client Components ("use client")

**Sử dụng khi:**
- Cần interactivity (onClick, onChange, etc.)
- Sử dụng hooks (useState, useEffect, useRouter, etc.)
- Sử dụng browser APIs
- Third-party libraries yêu cầu client-side (framer-motion, etc.)

**Mark với directive:**
```typescript
"use client"

import { useState } from "react"
```

### 🎯 Naming Convention

- **Cache Components**: `dashboard-stats-cached.tsx`, `users-list-cached.tsx`
- **Server Components**: `user-detail.tsx`, `users-table.tsx`
- **Client Components**: `user-detail.client.tsx`, `users-table.client.tsx`, `dashboard-stats.client.tsx`

### 📦 File Structure

```
features/admin/
├── dashboard/
│   ├── dashboard-stats-cached.tsx    # Cache Component (PPR)
│   ├── dashboard-stats.client.tsx   # Client Component
│   └── dashboard-stats.tsx          # Server Component (nếu cần)
├── users/
│   ├── components/
│   │   ├── user-detail.tsx          # Server Component
│   │   ├── user-detail.client.tsx   # Client Component
│   │   ├── users-table.tsx           # Server Component
│   │   └── users-table.client.tsx   # Client Component
│   └── server/
│       └── queries.ts                # Server queries với cache()
```

## 🔍 Kiểm tra Component Type

### Cache Component
- ✅ Có `"use cache"` directive ở đầu file
- ✅ Có thể `async`
- ✅ Có thể fetch data với `cache()`
- ✅ Enable Partial Pre-Rendering (PPR)
- ✅ Render static shell ngay, fetch data sau

### Server Component
- ✅ Không có `"use client"` hoặc `"use cache"` directive
- ✅ Có thể `async`
- ✅ Có thể gọi `await` trực tiếp
- ✅ Import từ `server/` directory
- ✅ Fetch data trực tiếp

### Client Component
- ✅ Có `"use client"` directive ở đầu file
- ✅ Sử dụng hooks và browser APIs
- ✅ Có event handlers
- ✅ Có thể fetch data từ API (nhưng nên nhận từ Server/Cache Component)

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
  return <UserDetailClient user={user} />
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
  return <UserDetailClient user={user} />
}

// ✅ GOOD - Client Component
"use client"
export function UserDetailClient({ user }: { user: User }) {
  const router = useRouter()
  // ...
}
```

## 📚 Ví dụ thực tế trong dự án

### 1. Users Table (Server → Client Pattern)
- `users-table.tsx` (Server): Fetch initial data với `listUsersCached()`
- `users-table.client.tsx` (Client): Handle pagination, filtering, sorting

### 2. User Detail (Server → Client Pattern)
- `user-detail.tsx` (Server): Fetch user data với `getUserDetailById()`
- `user-detail.client.tsx` (Client): Render UI với animations

### 3. Forms (Client Component)
- `user-create.tsx` (Client): Form submissions cần client-side
- `user-edit.tsx` (Client): Form submissions cần client-side

### 4. Dashboard Stats ✅ (Đã triển khai)
- `dashboard-stats.tsx` (Server): Fetch stats với `getDashboardStatsCached()`
- `dashboard-stats.client.tsx` (Client): Render charts và interactions
- Pattern: Server Component (with cache) → Client Component

## 🎓 So sánh 3 loại Components

| Đặc điểm | Cache Component | Server Component | Client Component |
|----------|----------------|------------------|------------------|
| **Directive** | `"use cache"`* | Không có | `"use client"` |
| **Render Location** | Server (PPR) | Server | Client |
| **JavaScript Bundle** | Minimal | Không có | Có |
| **Data Fetching** | ✅ Với `cache()` | ✅ Với `cache()` | ⚠️ Qua API (không nên) |
| **Hooks** | ❌ | ❌ | ✅ |
| **Event Handlers** | ❌ | ❌ | ✅ |
| **Browser APIs** | ❌ | ❌ | ✅ |
| **Caching** | ✅ Automatic | ✅ Với `cache()` | ❌ |
| **Partial Pre-Rendering** | ✅ | ❌ | ❌ |
| **Use Case** | Dashboard, Stats | Data fetching | UI interactions |

*Lưu ý: Trong Next.js 16, cache được implement thông qua React `cache()` trong Server Components. Directive `"use cache"` có thể chưa được hỗ trợ, nên pattern hiện tại sử dụng Server Component với `cache()` function.

## 🎓 Tài liệu tham khảo

- [Next.js 16: Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js 16: Partial Pre-Rendering](https://nextjs.org/docs/app/building-your-application/rendering/partial-prerendering)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Data Fetching in Next.js 16](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [React cache() API](https://react.dev/reference/react/cache)

