# Filter Options API Pattern - Next.js 16

Tài liệu này mô tả pattern để tạo API routes cho filter options theo column, tuân thủ chuẩn Next.js 16 với server-side caching và response caching.

## 📋 Tổng quan

Pattern này cho phép client components fetch filter options từ server với:
- **Server-side caching**: Sử dụng React `cache()` để deduplicate requests
- **Response caching**: Cache-Control headers cho API routes
- **Type-safe**: TypeScript đầy đủ
- **Consistent**: Tất cả resources sử dụng cùng pattern

## 🏗️ Kiến trúc

```
Client Component (useDynamicFilterOptions)
    ↓
API Route (/api/admin/{resource}/options)
    ↓
Helper Function (createOptionsHandler)
    ↓
Cached Query (get{Resource}ColumnOptionsCached)
    ↓
Database Query (get{Resource}ColumnOptions)
```

## 📁 Cấu trúc Files

### 1. Server Queries (`server/queries.ts`)

```typescript
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"

/**
 * Get unique values for a specific column (for filter options)
 */
export async function get{Resource}ColumnOptions(
  column: string,
  search?: string,
  limit: number = 50
): Promise<Array<{ label: string; value: string }>> {
  const where: Prisma.{Resource}WhereInput = {
    deletedAt: null, // Only active records
  }

  // Add search filter if provided
  if (search && search.trim()) {
    const searchValue = search.trim()
    switch (column) {
      case "columnName":
        where.columnName = { contains: searchValue, mode: "insensitive" }
        break
      // ... other columns
    }
  }

  // Build select based on column
  let selectField: Prisma.{Resource}Select
  switch (column) {
    case "columnName":
      selectField = { columnName: true }
      break
    // ... other columns
  }

  const results = await prisma.{resource}.findMany({
    where,
    select: selectField,
    orderBy: { [column]: "asc" },
    take: limit,
  })

  // Map results to options format
  return results
    .map((item) => {
      const value = item[column as keyof typeof item]
      if (typeof value === "string" && value.trim()) {
        return {
          label: value,
          value: value,
        }
      }
      return null
    })
    .filter((item): item is { label: string; value: string } => item !== null)
}
```

### 2. Server Cache (`server/cache.ts`)

```typescript
import { cache } from "react"
import { get{Resource}ColumnOptions } from "./queries"

/**
 * Cache function: Get {resource} column options for filters
 */
export const get{Resource}ColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    return get{Resource}ColumnOptions(column, search, limit)
  }
)
```

### 3. API Route (`app/api/admin/{resource}/options/route.ts`)

```typescript
/**
 * API Route: GET /api/admin/{resource}/options - Get filter options for a column
 * 
 * Theo chuẩn Next.js 16:
 * - Sử dụng server-side caching với React cache()
 * - Response caching với short-term cache (30s) để optimize performance
 * - Dynamic route vì có search query parameter
 */
import { NextRequest } from "next/server"
import { get{Resource}ColumnOptionsCached } from "@/features/admin/{resource}/server/cache"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { createOptionsHandler, optionsRouteConfig } from "@/lib/api/options-route-helper"

async function get{Resource}OptionsHandler(req: NextRequest, _context: ApiRouteContext) {
  return createOptionsHandler(req, {
    allowedColumns: ["column1", "column2"], // Whitelist allowed columns
    getOptions: (column, search, limit) => get{Resource}ColumnOptionsCached(column, search, limit),
  })
}

// Route Segment Config theo Next.js 16
// LƯU Ý: Phải export static values, không thể lấy từ object
// Theo: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
export const dynamic = "force-dynamic"
export const revalidate = false

export const GET = createGetRoute(get{Resource}OptionsHandler)
```

### 4. API Routes Config (`lib/api/routes.ts`)

```typescript
{resource}: {
  // ... other routes
  options: (params?: { column: string; search?: string; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.column) searchParams.set("column", params.column)
    if (params?.search) searchParams.set("search", params.search)
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    const queryString = searchParams.toString()
    return `/admin/{resource}/options${queryString ? `?${queryString}` : ""}`
  },
}
```

### 5. Client Component Usage

```typescript
"use client"

import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiRoutes } from "@/lib/api/routes"

export function {Resource}TableClient() {
  const nameFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.{resource}.options({ column: "name" }),
  })

  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      filter: {
        type: "select",
        options: nameFilter.options,
        onSearchChange: nameFilter.onSearchChange,
        isLoading: nameFilter.isLoading,
      },
    },
  ], [nameFilter])
  
  // ... rest of component
}
```

## 🔄 Caching Strategy

### 1. React Cache (Server-side)
- **Location**: `server/cache.ts`
- **Function**: `get{Resource}ColumnOptionsCached`
- **Purpose**: Deduplicate requests trong cùng render pass
- **Scope**: Request-level cache (chỉ trong một request)

### 2. Response Cache (API Route)
- **Location**: `lib/api/options-route-helper.ts`
- **Headers**: `Cache-Control: private, s-maxage=30, stale-while-revalidate=60`
- **Purpose**: Cache response ở edge/CDN và client
- **Duration**: 30 giây (s-maxage) + 60 giây stale-while-revalidate

### 3. Route Segment Config
- **dynamic**: `'force-dynamic'` - Route luôn dynamic vì có search query
- **revalidate**: `false` - Sử dụng Cache-Control headers thay vì time-based revalidation

## ✅ Best Practices

### 1. Column Whitelisting
Luôn whitelist allowed columns trong API route để tránh SQL injection:

```typescript
const allowedColumns = ["name", "slug"]
if (!allowedColumns.includes(column)) {
  return NextResponse.json({ error: "Column not allowed" }, { status: 400 })
}
```

### 2. Input Validation
Sử dụng `sanitizeSearchQuery` để validate và sanitize search input:

```typescript
const searchValidation = sanitizeSearchQuery(search, 100)
const searchValue = searchValidation.valid ? searchValidation.value : undefined
```

### 3. Error Handling
Sử dụng logger để log errors:

```typescript
catch (error) {
  logger.error(`Error fetching filter options for column '${column}'`, error)
  return NextResponse.json({ error: "Error message" }, { status: 500 })
}
```

### 4. Type Safety
Đảm bảo type safety với TypeScript:

```typescript
export interface OptionsRouteConfig {
  allowedColumns: string[]
  getOptions: (column: string, search?: string, limit?: number) => Promise<Array<{ label: string; value: string }>>
}
```

## 📊 Performance

### Caching Layers
1. **React Cache**: Deduplicate requests trong render pass
2. **Response Cache**: 30s cache ở edge/CDN
3. **Stale-while-revalidate**: Serve stale content trong 60s khi revalidating

### Benefits
- ✅ Giảm database queries
- ✅ Faster response times
- ✅ Better UX với stale-while-revalidate
- ✅ Automatic request deduplication

## 🔒 Security

### 1. Authentication
- Tất cả routes yêu cầu authentication (qua `createGetRoute`)
- Auto-detect permissions từ route config

### 2. Authorization
- Permission checks tự động qua `api-route-wrapper`
- Whitelist columns để tránh unauthorized access

### 3. Input Validation
- Sanitize search queries
- Validate column names
- Validate limit (1-100)

## 📝 Examples

### Categories
- Columns: `name`, `slug`
- Route: `/api/admin/categories/options`

### Tags
- Columns: `name`, `slug`
- Route: `/api/admin/tags/options`

### Users
- Columns: `email`, `name`
- Route: `/api/admin/users/options`

### Roles
- Columns: `name`, `displayName`
- Route: `/api/admin/roles/options`

### Students
- Columns: `studentCode`, `name`, `email`
- Route: `/api/admin/students/options`

### Contact Requests
- Columns: `name`, `email`, `phone`, `subject`
- Route: `/api/admin/contact-requests/options`

### Notifications
- Columns: `userEmail`
- Route: `/api/admin/notifications/options`

## 🎓 Tài liệu tham khảo

- [Next.js 16: Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Next.js 16: Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)
- [React cache() API](https://react.dev/reference/react/cache)
- [Next.js 16: Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)

