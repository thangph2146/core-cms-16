# Resource Feature Pattern - Next.js 16

Pattern này mô tả cách tổ chức một resource feature theo chuẩn Next.js 16, dựa trên cấu trúc của `users` feature.

## 📁 Cấu trúc thư mục

```
features/admin/{resource}/
├── components/
│   ├── {resource}-table.tsx           # Server Component (fetch data)
│   ├── {resource}-table.client.tsx    # Client Component (UI/interactions)
│   ├── {resource}-detail.tsx          # Server Component (fetch data)
│   ├── {resource}-detail.client.tsx   # Client Component (UI/interactions)
│   ├── {resource}-create.tsx          # Server Component (fetch options)
│   ├── {resource}-create.client.tsx   # Client Component (form)
│   ├── {resource}-edit.tsx            # Server Component (fetch data)
│   ├── {resource}-edit.client.tsx     # Client Component (form)
│   └── index.ts                       # Exports
├── server/
│   ├── queries.ts                     # Non-cached database queries
│   ├── cache.ts                       # Cached functions (React cache())
│   ├── helpers.ts                     # Shared helper functions
│   ├── mutations.ts                   # Data mutations
│   └── index.ts                       # Centralized exports
├── hooks/                             # Client-side hooks
├── types.ts                           # TypeScript types
├── form-fields.ts                     # Form field definitions
└── utils.ts                           # Utility functions
```

## 🏗️ Component Patterns

### 1. Server Component (Data Fetching)

```typescript
// {resource}-table.tsx
import { listResourceCached } from "../server/cache"
import { serializeResourceList } from "../server/helpers"
import { ResourceTableClient } from "./{resource}-table.client"

export async function ResourceTable({ ...props }: ResourceTableProps) {
  const data = await listResourceCached(1, 10, "", "", "active")
  
  return (
    <ResourceTableClient
      initialData={serializeResourceList(data)}
      {...props}
    />
  )
}
```

### 2. Client Component (UI/Interactions)

```typescript
// {resource}-table.client.tsx
"use client"

export function ResourceTableClient({ initialData, ...props }: ResourceTableClientProps) {
  // Client logic với hooks, state, interactions
  return <DataTable ... />
}
```

### 3. Cache Functions

```typescript
// server/cache.ts
import { cache } from "react"
import { listResource } from "./queries"

export const listResourceCached = cache(
  async (page: number, limit: number, search: string, filtersKey: string, status: string) => {
    return listResource({ page, limit, search, filters, status })
  }
)
```

### 4. Helpers

```typescript
// server/helpers.ts
export function serializeResourceList(data: ResourceResponse): DataTableResult {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map(serializeResourceForTable),
  }
}
```

## 📝 Naming Conventions

- **Server Components**: `{resource}-table.tsx`, `{resource}-detail.tsx`
- **Client Components**: `{resource}-table.client.tsx`, `{resource}-detail.client.tsx`
- **Cache Functions**: `list{Resource}Cached`, `get{Resource}ByIdCached`
- **Helpers**: `serialize{Resource}List`, `map{Resource}Record`

## 🔄 Data Flow

```
Page (Server)
  ↓
Server Component (fetch data với cache)
  ↓
Serialize data (helpers)
  ↓
Client Component (UI/interactions)
  ↓
User interactions
  ↓
API calls (mutations)
```

## ✅ Checklist cho feature mới

- [ ] Tạo `server/queries.ts` với non-cached queries
- [ ] Tạo `server/cache.ts` với cached functions
- [ ] Tạo `server/helpers.ts` với serialize functions
- [ ] Tạo `server/mutations.ts` với mutations
- [ ] Tạo `server/index.ts` với exports
- [ ] Tạo Server Components (fetch data)
- [ ] Tạo Client Components (UI/interactions)
- [ ] Tạo `components/index.ts` với exports rõ ràng
- [ ] Test và verify

## 🎯 Example: Users Feature

Xem `src/features/admin/users` để tham khảo implementation đầy đủ.

