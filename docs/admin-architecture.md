# Admin Architecture Documentation

Tài liệu chi tiết về kiến trúc Admin Panel dựa trên Next.js 16 và Prisma Schema.

## 📋 Mục lục

1. [Tổng quan](#tổng-quan)
2. [Database Models (Prisma Schema)](#database-models-prisma-schema)
3. [Shared Resources Pattern](#shared-resources-pattern)
4. [Component Architecture](#component-architecture)
5. [Hooks và Utilities](#hooks-và-utilities)
6. [Cách thêm Feature mới](#cách-thêm-feature-mới)
7. [Best Practices](#best-practices)

---

## Tổng quan

Admin Panel được xây dựng theo pattern **Resource-based Architecture**, mỗi resource tương ứng với một model trong Prisma Schema. Tất cả resources đều follow cùng một pattern để đảm bảo consistency và dễ dàng scale.

### Core Principles

1. **DRY (Don't Repeat Yourself)**: Shared utilities và components trong `@resources`
2. **Type Safety**: TypeScript strict mode với Prisma types
3. **Server Components First**: Next.js 16 Server Components cho data fetching
4. **Client Components cho Interactions**: Chỉ dùng Client Components khi cần interactivity
5. **Real-time Updates**: Socket.IO cho notifications và cache updates

---

## Database Models (Prisma Schema)

### Admin Resources Mapping

| Prisma Model | Admin Feature | Soft Delete | Special Fields |
|------------|---------------|-------------|----------------|
| `User` | `/admin/users` | ✅ `deletedAt` | `isActive`, `emailVerified` |
| `Category` | `/admin/categories` | ✅ `deletedAt` | `slug` (unique) |
| `Tag` | `/admin/tags` | ✅ `deletedAt` | `slug` (unique) |
| `Role` | `/admin/roles` | ✅ `deletedAt` | `isActive`, `permissions[]` |
| `Comment` | `/admin/comments` | ✅ `deletedAt` | `approved` |
| `Session` | `/admin/sessions` | ❌ (dùng `isActive`) | `isActive`, `expiresAt` |
| `Student` | `/admin/students` | ✅ `deletedAt` | `isActive`, `userId` (optional) |
| `ContactRequest` | `/admin/contact-requests` | ✅ `deletedAt` | `status`, `priority`, `isRead` |
| `Notification` | `/admin/notifications` | ❌ | `isRead`, `readAt`, `kind` |

### Model Relationships

```
User
├── Role (many-to-many via UserRole)
├── Session (one-to-many)
├── Student (one-to-many, optional)
├── Comment (one-to-many)
├── Notification (one-to-many)
└── ContactRequest (one-to-many, as submittedBy/assignedTo)

Post
├── Category (many-to-many via PostCategory)
├── Tag (many-to-many via PostTag)
└── Comment (one-to-many)

Comment
├── User (many-to-one, author)
└── Post (many-to-one)
```

### Soft Delete Pattern

**Models có `deletedAt`:**
- `User`, `Category`, `Tag`, `Role`, `Comment`, `Student`, `ContactRequest`

**Models dùng `isActive` thay vì `deletedAt`:**
- `Session` (dùng `isActive: false` để đánh dấu "deleted")

**Hard Delete:**
- Chỉ available khi viewing "deleted" items (filter `deletedAt IS NOT NULL`)
- Hoặc khi `isActive = false` (cho Session)

---

## Shared Resources Pattern

### Directory Structure

```
src/features/admin/
├── resources/              # Shared utilities và components
│   ├── components/        # Reusable UI components
│   │   ├── resource-table.client.tsx
│   │   ├── resource-form.tsx
│   │   ├── resource-detail-page.tsx
│   │   └── not-found-message.tsx
│   ├── hooks/             # Shared React hooks
│   │   ├── use-resource-form-submit.ts
│   │   ├── use-filter-options.ts
│   │   └── use-dynamic-filter-options.ts
│   ├── server/            # Server-side utilities
│   │   ├── auth-helpers.ts      # getAuthInfo()
│   │   └── page-helpers.ts      # getTablePermissionsAsync()
│   └── utils/             # Shared utility functions
│
└── {resource}/            # Feature-specific code
    ├── components/        # UI components
    │   ├── {resource}-table.client.tsx
    │   ├── {resource}-create.client.tsx
    │   ├── {resource}-edit.client.tsx
    │   ├── {resource}-detail.client.tsx
    │   └── {resource}-{action}.tsx (Server Components)
    ├── server/           # Server-side logic
    │   ├── cache.ts      # Data fetching với caching
    │   ├── queries.ts    # Prisma queries
    │   ├── mutations.ts  # CRUD operations
    │   ├── helpers.ts    # Serialization helpers
    │   ├── notifications.ts # Real-time notifications
    │   └── schemas.ts    # Zod validation schemas
    ├── form-fields.ts    # Form field definitions
    ├── types.ts          # TypeScript types
    └── utils.ts          # Resource-specific utilities
```

### Shared Components

#### 1. `ResourceTableClient`
Generic table component với:
- Sorting, filtering, pagination
- Bulk actions
- Row actions (view, edit, delete, restore)
- Conditional hard delete (chỉ khi viewing deleted items)

#### 2. `ResourceForm`
Generic form component với:
- Field validation
- Sections support
- Auto-save (optional)
- Error handling

#### 3. `ResourceDetailClient`
Generic detail page với:
- Sections support
- Custom `fieldsContent` (React Node)
- Action buttons
- Back navigation

#### 4. `NotFoundMessage`
Reusable "Not Found" component

### Shared Hooks

#### `useResourceFormSubmit`
Centralized form submission hook:
- API calls với error handling
- Toast notifications
- Navigation after success
- Data transformation support
- Validation error handling

**Usage:**
```typescript
const { handleSubmit } = useResourceFormSubmit({
  apiRoute: apiRoutes.categories.create,
  method: "POST",
  messages: {
    successTitle: "Tạo danh mục thành công",
    successDescription: "Danh mục mới đã được tạo thành công.",
    errorTitle: "Lỗi tạo danh mục",
  },
  navigation: {
    toDetail: (response) =>
      response.data?.data?.id ? `/admin/categories/${response.data.data.id}` : backUrl,
    fallback: backUrl,
  },
  transformData: (data) => ({
    ...data,
    slug: data.slug || generateSlug(data.name),
  }),
})
```

### Shared Server Utilities

#### `getAuthInfo()`
Centralized auth information retrieval:
```typescript
const { session, permissions, roles, actorId, isSuperAdminUser } = await getAuthInfo()
```

#### `getTablePermissionsAsync()`
Permission checks cho table actions:
```typescript
const { canDelete, canRestore, canManage, canCreate } = await getTablePermissionsAsync({
  delete: [PERMISSIONS.CATEGORIES_DELETE, PERMISSIONS.CATEGORIES_MANAGE],
  restore: [PERMISSIONS.CATEGORIES_UPDATE, PERMISSIONS.CATEGORIES_MANAGE],
  manage: PERMISSIONS.CATEGORIES_MANAGE,
  create: PERMISSIONS.CATEGORIES_CREATE,
})
```

---

## Component Architecture

### Server Components (Data Fetching)

**Pattern:**
```typescript
// app/admin/{resource}/page.tsx
export default async function ResourcePage() {
  const { canDelete, canRestore, canManage, canCreate } = await getTablePermissionsAsync({
    delete: [PERMISSIONS.RESOURCE_DELETE, PERMISSIONS.RESOURCE_MANAGE],
    restore: [PERMISSIONS.RESOURCE_UPDATE, PERMISSIONS.RESOURCE_MANAGE],
    manage: PERMISSIONS.RESOURCE_MANAGE,
    create: PERMISSIONS.RESOURCE_CREATE,
  })

  return (
    <>
      <AdminHeader breadcrumbs={[{ label: "Resource", isActive: true }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceTable
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

**Detail/Edit Server Components:**
```typescript
// components/{resource}-detail.tsx
export async function ResourceDetail({ resourceId, backUrl }: ResourceDetailProps) {
  const resource = await getResourceDetailById(resourceId)

  if (!resource) {
    return <NotFoundMessage resourceName="resource" />
  }

  return (
    <ResourceDetailClient
      resource={serializeResourceDetail(resource)}
      backUrl={backUrl}
    />
  )
}
```

### Client Components (Interactions)

**Create Component:**
```typescript
export function ResourceCreateClient({ backUrl }: ResourceCreateClientProps) {
  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: apiRoutes.resources.create,
    method: "POST",
    messages: {
      successTitle: "Tạo resource thành công",
      successDescription: "Resource mới đã được tạo thành công.",
      errorTitle: "Lỗi tạo resource",
    },
    navigation: {
      toDetail: (response) =>
        response.data?.data?.id ? `/admin/resources/${response.data.data.id}` : backUrl,
      fallback: backUrl,
    },
  })

  const createFields = getBaseResourceFields()

  return (
    <ResourceForm
      data={null}
      fields={createFields}
      onSubmit={handleSubmit}
      title="Tạo resource mới"
      description="Nhập thông tin để tạo resource mới"
      submitLabel="Tạo resource"
      backUrl={backUrl}
      variant="page"
    />
  )
}
```

**Edit Component:**
```typescript
export function ResourceEditClient({
  resource,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
}: ResourceEditClientProps) {
  if (!resource?.id) {
    return null
  }

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: (id) => apiRoutes.resources.update(id),
    method: "PUT",
    resourceId: resource.id,
    messages: {
      successTitle: "Cập nhật resource thành công",
      successDescription: "Resource đã được cập nhật thành công.",
      errorTitle: "Lỗi cập nhật resource",
    },
    navigation: {
      toDetail: variant === "page" && backUrl
        ? backUrl
        : variant === "page" && resource.id
          ? `/admin/resources/${resource.id}`
          : undefined,
      fallback: backUrl,
    },
    onSuccess: async () => {
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  const editFields = getBaseResourceFields()

  return (
    <ResourceForm
      data={resource}
      fields={editFields}
      onSubmit={handleSubmit}
      title="Chỉnh sửa resource"
      description="Cập nhật thông tin resource"
      submitLabel="Lưu thay đổi"
      backUrl={backUrl}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
```

---

## Hooks và Utilities

### `useResourceFormSubmit`

**Purpose:** Centralized form submission với error handling, toast notifications, và navigation.

**Features:**
- Support cả create (POST) và update (PUT/PATCH)
- Dynamic API routes (function support)
- Data transformation trước khi submit
- Custom success handlers
- Flexible navigation options

**Options:**
```typescript
interface UseResourceFormSubmitOptions {
  apiRoute: string | ((resourceId: string) => string)
  method?: "POST" | "PUT" | "PATCH"
  resourceId?: string
  messages: {
    successTitle: string
    successDescription: string
    errorTitle: string
    errorDescription?: string
  }
  navigation?: {
    toDetail?: boolean | string | ((response: AxiosResponse) => string | undefined)
    fallback?: string
  }
  transformData?: (data: Record<string, unknown>) => Record<string, unknown>
  onSuccess?: (response: AxiosResponse) => void | Promise<void>
}
```

### `getAuthInfo()`

**Purpose:** Fetch tất cả auth information trong một lần gọi.

**Returns:**
```typescript
interface AuthInfo {
  session: SessionWithMeta | null
  permissions: Permission[]
  roles: Array<{ name: string }>
  actorId: string | undefined
  isSuperAdminUser: boolean
}
```

### `getTablePermissionsAsync()`

**Purpose:** Check permissions cho table actions.

**Usage:**
```typescript
const { canDelete, canRestore, canManage, canCreate } = await getTablePermissionsAsync({
  delete: [PERMISSIONS.RESOURCE_DELETE, PERMISSIONS.RESOURCE_MANAGE],
  restore: [PERMISSIONS.RESOURCE_UPDATE, PERMISSIONS.RESOURCE_MANAGE],
  manage: PERMISSIONS.RESOURCE_MANAGE,
  create: PERMISSIONS.RESOURCE_CREATE,
})
```

---

## Cách thêm Feature mới

### Bước 1: Tạo Prisma Model (nếu chưa có)

```prisma
model NewResource {
  id        String    @id @default(cuid())
  name      String
  slug      String    @unique
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@map("new_resources")
}
```

### Bước 2: Tạo Feature Structure

```bash
src/features/admin/new-resource/
├── components/
│   ├── new-resource-table.client.tsx
│   ├── new-resource-create.client.tsx
│   ├── new-resource-edit.client.tsx
│   ├── new-resource-detail.client.tsx
│   ├── new-resource-create.tsx (Server)
│   ├── new-resource-edit.tsx (Server)
│   └── new-resource-detail.tsx (Server)
├── server/
│   ├── cache.ts
│   ├── queries.ts
│   ├── mutations.ts
│   ├── helpers.ts
│   ├── notifications.ts
│   └── schemas.ts
├── form-fields.ts
├── types.ts
└── utils.ts
```

### Bước 3: Implement Server Logic

**`server/schemas.ts`:**
```typescript
import { z } from "zod"

export const createNewResourceSchema = z.object({
  name: z.string().min(1, "Tên là bắt buộc"),
  slug: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const updateNewResourceSchema = createNewResourceSchema.partial()

export type CreateNewResourceInput = z.infer<typeof createNewResourceSchema>
export type UpdateNewResourceInput = z.infer<typeof updateNewResourceSchema>
```

**`server/queries.ts`:**
```typescript
import { prisma } from "@/lib/prisma"

export async function getNewResources(params: {
  page?: number
  limit?: number
  search?: string
  deleted?: boolean
}) {
  // Implementation
}
```

**`server/mutations.ts`:**
```typescript
import { prisma } from "@/lib/prisma"
import { createNewResourceSchema, updateNewResourceSchema } from "./schemas"

export async function createNewResource(data: CreateNewResourceInput) {
  // Implementation với Zod validation
}

export async function updateNewResource(id: string, data: UpdateNewResourceInput) {
  // Implementation
}

export async function deleteNewResource(id: string) {
  // Soft delete
}

export async function restoreNewResource(id: string) {
  // Restore từ soft delete
}

export async function hardDeleteNewResource(id: string) {
  // Hard delete (chỉ khi deletedAt IS NOT NULL)
}
```

**`server/notifications.ts`:**
```typescript
import { emitNotification } from "@/lib/socket/server"

export async function notifyNewResourceCreated(resourceId: string, actorId: string) {
  await emitNotification({
    userId: actorId,
    kind: "SUCCESS",
    title: "Tạo resource mới thành công",
    description: `Resource "${name}" đã được tạo thành công.`,
    actionUrl: `/admin/new-resources/${resourceId}`,
  })
}
```

### Bước 4: Implement UI Components

**`components/new-resource-table.client.tsx`:**
```typescript
"use client"

import { ResourceTableClient } from "@/features/admin/resources/components"
import { useNewResources } from "../hooks/use-new-resources"
// ... implementation
```

**`components/new-resource-create.client.tsx`:**
```typescript
"use client"

import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { getBaseNewResourceFields } from "../form-fields"

export function NewResourceCreateClient({ backUrl = "/admin/new-resources" }: Props) {
  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: apiRoutes.newResources.create,
    method: "POST",
    messages: {
      successTitle: "Tạo resource thành công",
      successDescription: "Resource mới đã được tạo thành công.",
      errorTitle: "Lỗi tạo resource",
    },
    navigation: {
      toDetail: (response) =>
        response.data?.data?.id ? `/admin/new-resources/${response.data.data.id}` : backUrl,
      fallback: backUrl,
    },
  })

  const createFields = getBaseNewResourceFields()

  return (
    <ResourceForm
      data={null}
      fields={createFields}
      onSubmit={handleSubmit}
      title="Tạo resource mới"
      description="Nhập thông tin để tạo resource mới"
      submitLabel="Tạo resource"
      backUrl={backUrl}
      variant="page"
    />
  )
}
```

### Bước 5: Tạo API Routes

**`app/api/admin/new-resources/route.ts`:**
```typescript
import { createNewResource } from "@/features/admin/new-resource/server/mutations"
import { createNewResourceSchema } from "@/features/admin/new-resource/server/schemas"
// ... implementation
```

**`app/api/admin/new-resources/[id]/route.ts`:**
```typescript
// GET, PUT, DELETE handlers
```

**`app/api/admin/new-resources/[id]/restore/route.ts`:**
```typescript
// Restore handler
```

**`app/api/admin/new-resources/[id]/hard-delete/route.ts`:**
```typescript
// Hard delete handler (chỉ khi deletedAt IS NOT NULL)
```

### Bước 6: Tạo Pages

**`app/admin/new-resources/page.tsx`:**
```typescript
import { getTablePermissionsAsync } from "@/features/admin/resources/server"
import { PERMISSIONS } from "@/lib/permissions"
import { NewResourcesTable } from "@/features/admin/new-resource/components/new-resource-table"

export default async function NewResourcesPage() {
  const { canDelete, canRestore, canManage, canCreate } = await getTablePermissionsAsync({
    delete: [PERMISSIONS.NEW_RESOURCES_DELETE, PERMISSIONS.NEW_RESOURCES_MANAGE],
    restore: [PERMISSIONS.NEW_RESOURCES_UPDATE, PERMISSIONS.NEW_RESOURCES_MANAGE],
    manage: PERMISSIONS.NEW_RESOURCES_MANAGE,
    create: PERMISSIONS.NEW_RESOURCES_CREATE,
  })

  return (
    <>
      <AdminHeader breadcrumbs={[{ label: "New Resources", isActive: true }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <NewResourcesTable
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

**`app/admin/new-resources/[id]/page.tsx`:**
```typescript
import { NewResourceDetail } from "@/features/admin/new-resource/components/new-resource-detail"

export default async function NewResourceDetailClient({ params }: { params: { id: string } }) {
  return <NewResourceDetail resourceId={params.id} />
}
```

**`app/admin/new-resources/new/page.tsx`:**
```typescript
import { NewResourceCreate } from "@/features/admin/new-resource/components/new-resource-create"

export default function NewResourceCreatePage() {
  return <NewResourceCreate />
}
```

**`app/admin/new-resources/[id]/edit/page.tsx`:**
```typescript
import { NewResourceEdit } from "@/features/admin/new-resource/components/new-resource-edit"

export default async function NewResourceEditPage({ params }: { params: { id: string } }) {
  return <NewResourceEdit resourceId={params.id} variant="page" />
}
```

---

## Best Practices

### 1. Code Organization

- ✅ **Shared code** → `@resources`
- ✅ **Resource-specific code** → `@resource-name`
- ✅ **Server logic** → `server/` folder
- ✅ **Client components** → `components/` folder với `.client.tsx` suffix
- ✅ **Server components** → `components/` folder không có suffix

### 2. Type Safety

- ✅ Luôn dùng Prisma types từ `@prisma/client`
- ✅ Serialize data trước khi pass vào Client Components
- ✅ Dùng Zod schemas cho validation
- ✅ Type-safe API routes với TypeScript

### 3. Error Handling

- ✅ Server-side: Zod validation + Prisma error handling
- ✅ Client-side: `useResourceFormSubmit` hook tự động handle errors
- ✅ Toast notifications cho user feedback
- ✅ `NotFoundMessage` component cho missing resources

### 4. Performance

- ✅ Server Components cho initial data fetching
- ✅ React.useMemo và React.useCallback cho expensive operations
- ✅ TanStack Query với caching
- ✅ Prisma query optimization (select only needed fields)

### 5. Real-time Updates

- ✅ Socket.IO notifications cho tất cả mutations
- ✅ Cache invalidation sau mutations
- ✅ Optimistic updates khi có thể

### 6. Permissions

- ✅ Check permissions ở Server Components
- ✅ Pass permission flags vào Client Components
- ✅ Conditional rendering dựa trên permissions
- ✅ Server-side validation cho tất cả mutations

### 7. Soft Delete Pattern

**Models có `deletedAt`:**
```typescript
// List: Filter deletedAt IS NULL
// Deleted list: Filter deletedAt IS NOT NULL
// Hard delete: Chỉ available khi viewing deleted items
```

**Models dùng `isActive`:**
```typescript
// List: Filter isActive = true
// Deleted list: Filter isActive = false
// Hard delete: Chỉ available khi isActive = false
```

### 8. Form Submission

- ✅ **Luôn dùng `useResourceFormSubmit` hook** thay vì manual implementation
- ✅ Transform data trong `transformData` callback
- ✅ Validate required fields trong `transformData` (throw error)
- ✅ Custom navigation logic trong `navigation.toDetail` function

### 9. Component Naming

- ✅ Server Components: `{Resource}{Action}.tsx` (e.g., `UserDetail.tsx`)
- ✅ Client Components: `{Resource}{Action}.client.tsx` (e.g., `UserDetailClient.tsx`)
- ✅ Table Components: `{Resource}sTable` (e.g., `UsersTable`)

### 10. File Structure Consistency

Mỗi resource feature phải có:
- ✅ `server/cache.ts` - Data fetching với caching
- ✅ `server/queries.ts` - Prisma queries
- ✅ `server/mutations.ts` - CRUD operations
- ✅ `server/helpers.ts` - Serialization helpers
- ✅ `server/notifications.ts` - Real-time notifications
- ✅ `server/schemas.ts` - Zod validation schemas
- ✅ `form-fields.ts` - Form field definitions
- ✅ `types.ts` - TypeScript types
- ✅ `utils.ts` - Resource-specific utilities (nếu cần)

---

## Code Reduction Summary

### Trước Clean Code

- **Page Components**: ~40-50 dòng mỗi file (manual permission checks)
- **Create Components**: ~100-120 dòng mỗi file (manual API calls, error handling)
- **Edit Components**: ~120-150 dòng mỗi file (manual API calls, error handling)
- **Detail Components**: ~15-20 dòng JSX cho "Not Found" message

### Sau Clean Code

- **Page Components**: ~20-25 dòng mỗi file (dùng `getTablePermissionsAsync`)
- **Create Components**: ~40-60 dòng mỗi file (dùng `useResourceFormSubmit`)
- **Edit Components**: ~60-90 dòng mỗi file (dùng `useResourceFormSubmit`)
- **Detail Components**: 1 dòng cho "Not Found" (dùng `NotFoundMessage`)

### Tổng giảm code

- **~50-60% code reduction** trong create/edit components
- **~40% code reduction** trong page components
- **~1000+ dòng code duplicate** đã được loại bỏ
- **Consistent patterns** across tất cả features

---

## Examples

### Example 1: Simple Resource (Category, Tag)

```typescript
// Minimal implementation với shared utilities
// Chỉ cần: schemas, mutations, form-fields, types
```

### Example 2: Resource với Relations (Student)

```typescript
// Cần thêm: User selection logic
// Permission-based filtering (super admin vs regular user)
```

### Example 3: Resource với Special Actions (Comment)

```typescript
// Cần thêm: Approve/Unapprove actions
// Switch component cho status toggling
```

### Example 4: Resource với Complex State (ContactRequest)

```typescript
// Cần thêm: Status và Priority enums
// Assign functionality
// Switch component cho isRead
```

---

## Migration Guide

### Từ Old Pattern sang New Pattern

1. **Replace manual `handleSubmit`** → `useResourceFormSubmit`
2. **Replace manual permission checks** → `getTablePermissionsAsync`
3. **Replace "Not Found" JSX** → `NotFoundMessage` component
4. **Replace manual auth checks** → `getAuthInfo()`

### Checklist khi thêm Feature mới

- [ ] Prisma model đã được định nghĩa
- [ ] Zod schemas cho validation
- [ ] Server mutations với notifications
- [ ] Cache functions với proper filtering
- [ ] Form fields definition
- [ ] Types definition
- [ ] Create component (dùng `useResourceFormSubmit`)
- [ ] Edit component (dùng `useResourceFormSubmit`)
- [ ] Detail component (dùng `NotFoundMessage`)
- [ ] Table component
- [ ] API routes với Zod validation
- [ ] Page components (dùng `getTablePermissionsAsync`)
- [ ] **Routes đã được thêm vào `route-config.ts`** (menu và API routes sẽ tự động update)
- [ ] Permissions đã được định nghĩa
- [ ] Real-time notifications đã được implement
- [ ] **Menu item đã được thêm vào `menu-data.ts`** (nếu cần custom, hoặc dùng `createMenuItemFromRoute`)
- [ ] **API routes đã được generate** (tự động từ `route-config.ts` qua `generateResourceApiRoutes`)

---

## Troubleshooting

### Common Issues

1. **React Hook Rules Error**
   - ❌ Không gọi hooks sau early return
   - ✅ Gọi hooks ở top level, check null sau đó

2. **Type Errors với Nullable Props**
   - ❌ `resource.id` khi `resource` có thể null
   - ✅ `resource?.id` hoặc check null trước

3. **TransformData Errors**
   - ❌ Access properties mà không check type
   - ✅ Type guards hoặc type assertions

4. **Navigation không hoạt động**
   - ❌ Hardcode paths
   - ✅ Dùng `navigation.toDetail` function

---

## Route Configuration (`route-config.ts`)

### Tổng quan

`route-config.ts` là **single source of truth** cho tất cả route permissions trong hệ thống. File này tự động generate CRUD routes để giảm duplicate code và đảm bảo consistency.

### Cấu trúc

```typescript
// Generate standard admin API routes
function generateStandardAdminApiRoutes(name: string, permissions: ResourceConfig["permissions"])

// Generate CRUD routes cho một resource
function generateResourceRoutes(config: ResourceConfig): RoutePermissionConfig[]
```

### Resource Config

```typescript
interface ResourceConfig {
  name: string
  permissions: {
    view: Permission
    create: Permission
    update: Permission
    delete: Permission
    manage?: Permission
  }
  customPages?: Array<{ path: string; permissions: Permission[] }>
  customApi?: Array<{ path: string; method: HttpMethod; permissions: Permission[] }>
  adminApi?: boolean | Array<{ path: string; method: HttpMethod; permissions: Permission[] }>
}
```

### Auto-generated Routes

Khi dùng `generateResourceRoutes()`, hệ thống tự động generate:

**Page Routes:**
- `GET /admin/{name}` - List page
- `GET /admin/{name}/new` - Create page
- `GET /admin/{name}/[id]` - Detail page
- `GET /admin/{name}/[id]/edit` - Edit page

**API Routes:**
- `GET /api/{name}` - List API
- `POST /api/{name}` - Create API
- `GET /api/{name}/[id]` - Get detail API
- `PUT /api/{name}/[id]` - Update API
- `DELETE /api/{name}/[id]` - Delete API

**Admin API Routes (khi `adminApi: true`):**
- `GET /api/admin/{name}` - List
- `POST /api/admin/{name}` - Create
- `GET /api/admin/{name}/[id]` - Get detail
- `PUT /api/admin/{name}/[id]` - Update
- `DELETE /api/admin/{name}/[id]` - Delete
- `POST /api/admin/{name}/bulk` - Bulk actions
- `POST /api/admin/{name}/[id]/restore` - Restore
- `DELETE /api/admin/{name}/[id]/hard-delete` - Hard delete
- `GET /api/admin/{name}/options` - Filter options

### Usage Examples

**Standard Resource (Categories, Tags, Students):**
```typescript
...generateResourceRoutes({
  name: "categories",
  permissions: {
    view: PERMISSIONS.CATEGORIES_VIEW,
    create: PERMISSIONS.CATEGORIES_CREATE,
    update: PERMISSIONS.CATEGORIES_UPDATE,
    delete: PERMISSIONS.CATEGORIES_DELETE,
    manage: PERMISSIONS.CATEGORIES_MANAGE,
  },
  adminApi: true, // Use standard admin API routes
})
```

**Resource với Custom Routes (Users, Roles):**
```typescript
...generateResourceRoutes({
  name: "users",
  permissions: {
    view: PERMISSIONS.USERS_VIEW,
    create: PERMISSIONS.USERS_CREATE,
    update: PERMISSIONS.USERS_UPDATE,
    delete: PERMISSIONS.USERS_DELETE,
    manage: PERMISSIONS.USERS_MANAGE,
  },
  adminApi: [
    { path: "", method: "GET", permissions: [PERMISSIONS.USERS_VIEW] },
    { path: "", method: "POST", permissions: [PERMISSIONS.USERS_CREATE] },
    { path: "/[id]", method: "GET", permissions: [PERMISSIONS.USERS_VIEW] },
    { path: "/[id]", method: "PUT", permissions: [PERMISSIONS.USERS_UPDATE] },
    { path: "/[id]", method: "DELETE", permissions: [PERMISSIONS.USERS_DELETE] },
    { path: "/bulk", method: "POST", permissions: [PERMISSIONS.USERS_MANAGE] },
    { path: "/[id]/restore", method: "POST", permissions: [PERMISSIONS.USERS_UPDATE] },
    { path: "/[id]/hard-delete", method: "DELETE", permissions: [PERMISSIONS.USERS_MANAGE] },
  ],
})
```

**Resource không có đầy đủ CRUD permissions (Comments, Contact Requests):**
```typescript
// Comments - không có CREATE/UPDATE permissions
{ path: "/admin/comments", permissions: [PERMISSIONS.COMMENTS_VIEW], type: "page" },
{ path: "/api/admin/comments/[id]/approve", method: "POST", permissions: [PERMISSIONS.COMMENTS_APPROVE], type: "api" },
// ... manual routes
```

### Benefits

1. **DRY Principle**: Không cần define routes manually cho mỗi resource
2. **Consistency**: Tất cả resources follow cùng pattern
3. **Type Safety**: TypeScript ensures permissions are valid
4. **Easy to Scale**: Chỉ cần thêm config, không cần viết routes manually
5. **Single Source of Truth**: Tất cả route permissions ở một nơi

### Generated Route Permissions

Routes được generate từ `ROUTE_CONFIG` được sử dụng bởi:

- `route-permissions.ts` - Page route permissions mapping
- `api-route-permissions.ts` - API route permissions mapping
- `api-route-wrapper.ts` - API route permission checking middleware
- `menu-data.ts` - Menu generation từ routes (single source of truth)

### Route Helpers (`route-helpers.ts`)

Helper functions để extract routes từ `ROUTE_CONFIG`:

```typescript
// Get all page routes
getPageRoutes(): RoutePermissionConfig[]

// Get routes cho một resource
getResourceRoutes(resourceName: string): RoutePermissionConfig[]

// Get main route (list page)
getResourceMainRoute(resourceName: string): RoutePermissionConfig | undefined

// Get create route
getResourceCreateRoute(resourceName: string): RoutePermissionConfig | undefined

// Get sub-routes (custom pages)
getResourceSubRoutes(resourceName: string): RoutePermissionConfig[]
```

### Menu Data Integration

`menu-data.ts` sử dụng routes từ `route-config.ts` để đảm bảo consistency:

**Trước (Hardcoded URLs):**
```typescript
{
  title: "Người dùng",
  url: "/admin/users", // Hardcoded
  items: [
    { title: "Danh sách", url: "/admin/users" }, // Hardcoded
    { title: "Thêm mới", url: "/admin/users/new" }, // Hardcoded
  ]
}
```

**Sau (Từ route-config.ts):**
```typescript
createMenuItemFromRoute("users", "Người dùng", icon)
// Tự động extract:
// - Main route: /admin/users
// - Create route: /admin/users/new
// - Sub routes: từ route-config.ts
```

**Benefits:**
- ✅ Single source of truth: URLs chỉ được define một lần trong `route-config.ts`
- ✅ Auto-sync: Khi thay đổi route trong `route-config.ts`, menu tự động update
- ✅ Type-safe: TypeScript ensures routes exist
- ✅ Consistent: Tất cả menu items follow cùng pattern

### API Routes Integration (`api-route-helpers.ts`)

`routes.ts` sử dụng routes từ `route-config.ts` để generate API routes:

**Trước (Hardcoded API Routes):**
```typescript
users: {
  list: (params) => `/admin/users${queryString}`,
  detail: (id) => `/admin/users/${id}`,
  create: "/admin/users",
  update: (id) => `/admin/users/${id}`,
  // ... 100+ lines of duplicate code
}
```

**Sau (Từ route-config.ts):**
```typescript
import { generateResourceApiRoutes } from "@/lib/permissions/api-route-helpers"

users: generateResourceApiRoutes("users"),
// Tự động generate tất cả CRUD routes từ ROUTE_CONFIG
```

**API Route Helpers:**

```typescript
// Generate standard API routes cho resource
generateResourceApiRoutes(resourceName: string)

// Get specific API route
getResourceApiRoute(resourceName: string, method: HttpMethod, action?: string)

// Get all admin API routes cho resource
getResourceAdminApiRoutes(resourceName: string)
```

**Custom Actions:**

Resources với custom actions (như `approve`, `assign`) có thể extend:

```typescript
comments: {
  ...generateResourceApiRoutes("comments"),
  approve: (id: string) => getResourceApiRoute("comments", "POST", "approve")?.replace("[id]", id),
  unapprove: (id: string) => getResourceApiRoute("comments", "POST", "unapprove")?.replace("[id]", id),
}
```

**Code Reduction:**
- **Trước**: ~300 lines cho 8 resources = ~2400 lines
- **Sau**: ~10 lines cho 8 resources = ~80 lines
- **Giảm**: ~97% code duplication

**Benefits:**
- ✅ Single source of truth: API routes chỉ được define một lần trong `route-config.ts`
- ✅ Auto-sync: Khi thay đổi route trong `route-config.ts`, API routes tự động update
- ✅ Type-safe: TypeScript ensures routes exist
- ✅ Consistent: Tất cả API routes follow cùng pattern
- ✅ DRY: Không duplicate code cho mỗi resource

---

## Resources

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TanStack Query](https://tanstack.com/query)
- [Zod Validation](https://zod.dev)
- [Socket.IO](https://socket.io/docs)

---

**Last Updated:** 2024
**Version:** 1.0.0

