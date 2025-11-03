# DataTable Component - Hướng dẫn sử dụng

`DataTable` là component bảng dữ liệu tái sử dụng, tích hợp Suspense của React 19 / Next.js 16 để xử lý load dữ liệu bất đồng bộ. Component hỗ trợ:

- Pagination server-side với `page`, `limit`, `total`, `totalPages`
- Search toàn bảng
- Filter theo từng cột (text, select, date picker, hoặc command/combobox)
- Tùy biến cell renderer cho từng cột
- Gắn actions theo từng dòng (edit/delete...)
- Lựa chọn nhiều dòng, chọn tất cả và hiển thị bulk actions theo permission
- Làm việc trực tiếp với dữ liệu Prisma thông qua loader

## Cấu trúc thư mục

```
src/
├── components/
│   └── data-table.tsx                # DataTable generics kèm Suspense + selection
└── features/
    └── users/
        ├── components/users-table.tsx  # Ví dụ triển khai cho model User
        └── server/queries.ts           # Prisma queries tái sử dụng
```

## 1. Định nghĩa Columns

Sử dụng `DataTableColumn<T>` để mô tả mỗi cột:

```typescript
import { type DataTableColumn } from "@/components/data-table"

interface UserRow {
  id: string
  email: string
  name: string | null
  isActive: boolean
  createdAt: string
}

const columns: DataTableColumn<UserRow>[] = [
  {
    accessorKey: "email",
    header: "Email",
    filter: { placeholder: "Lọc email..." },
    searchable: true,
  },
  {
    accessorKey: "name",
    header: "Tên",
    filter: { placeholder: "Lọc tên..." },
    searchable: true,
    cell: (row) => row.name ?? "-",
  },
  {
    accessorKey: "isActive",
    header: "Trạng thái",
    filter: {
      type: "select",
      placeholder: "Tất cả trạng thái",
      options: [
        { label: "Hoạt động", value: "true" },
        { label: "Ngưng hoạt động", value: "false" },
      ],
    },
    cell: (row) => (row.isActive ? "Active" : "Inactive"),
  },
  {
    accessorKey: "createdAt",
    header: "Ngày tạo",
    filter: {
      type: "date",
      placeholder: "Chọn ngày",
      dateFormat: "dd/MM/yyyy",
    },
    cell: (row) => new Date(row.createdAt).toLocaleString("vi-VN"),
  },
]
```

## 2. Viết loader (server-side)

`DataTable` nhận một `loader` dạng `DataTableLoader<T>`, chạy mỗi khi người dùng đổi page/limit/search/filter. Loader nên gọi API hoặc hành động server khác và trả về:

```typescript
import type {
  DataTableLoader,
  DataTableQueryState,
  DataTableResult,
} from "@/components/data-table"

const loader: DataTableLoader<UserRow> = async (
  query: DataTableQueryState,
): Promise<DataTableResult<UserRow>> => {
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

  const response = await fetch(`/api/users?${params}`, { cache: "no-store" })
  if (!response.ok) throw new Error("Failed to fetch users")

  const payload = await response.json()
  return {
    rows: payload.data as UserRow[],
    page: payload.pagination.page,
    limit: payload.pagination.limit,
    total: payload.pagination.total,
    totalPages: payload.pagination.totalPages,
  }
}
```

> **Ghi chú:** Loader có thể gọi trực tiếp Prisma trong Server Component hoặc thông qua API route. Chỉ cần đảm bảo trả về đúng schema trên.

## 3. Render DataTable

```tsx
import { useState } from "react"
import { DataTable, type DataTableSelectionChange } from "@/components/data-table"

export function UsersTable({ canManage }: { canManage: boolean }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleSelectionChange = (change: DataTableSelectionChange<UserRow>) => {
    setSelectedIds(change.ids)
  }

  return (
    <DataTable
      columns={columns}
      loader={loader}
      enableSearch
      searchPlaceholder="Tìm theo email hoặc tên..."
      limitOptions={[10, 20, 50]}
      getRowId={(row) => row.id}
      emptyMessage="Không tìm thấy người dùng"
      selection={
        canManage
          ? {
              enabled: true,
              selectedIds,
              onSelectionChange: handleSelectionChange,
            }
          : undefined
      }
      selectionActions={
        canManage
          ? ({ selectedIds, clearSelection }) => (
              <div className="flex items-center justify-between">
                <span>Đã chọn {selectedIds.length} người dùng</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDeactivate(selectedIds)}>
                    Vô hiệu hóa
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )
          : undefined
      }
      actions={(row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.id)}>Chỉnh sửa</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(row.id)}>Xóa</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    />
  )
}
```

## 4. Bulk actions theo permission

Sử dụng `selection` để bật multi-select khi user có quyền, và `selectionActions` để render thanh thao tác hàng loạt (ẩn đi nếu không có quyền).

## Props quan trọng

- `columns`: Mảng `DataTableColumn<T>` mô tả cột và filter
- `loader`: Hàm async nhận `page`, `limit`, `search`, `filters`
- `enableSearch`: Bật/tắt ô search toàn bảng (mặc định: `true`)
- `limitOptions`: Tùy chỉnh danh sách page size (mặc định: `[10, 20, 50]`)
- `getRowId`: Hàm lấy `key` cho mỗi dòng (fallback: `row.id` hoặc index)
- `actions`: Renderer cho cột hành động
- `selection`: Bật/tắt lựa chọn nhiều dòng, kiểm soát state và rule (ví dụ disable theo permission)
- `selectionActions`: Renderer cho thanh bulk actions (nhận `selectedIds`, `selectedRows`, `clearSelection`)
- `refreshKey`: Thay đổi giá trị này để force reload dữ liệu bên ngoài (ví dụ sau thao tác CRUD)

## Quick Start Example

```typescript
"use client"

import { useState } from "react"
import {
  DataTable,
  type DataTableColumn,
  type DataTableLoader,
  type DataTableQueryState,
} from "@/components/data-table"
import { Button } from "@/components/ui/button"

interface MyData {
  id: string
  name: string
  email: string
  status: "active" | "inactive"
  createdAt: string
}

const columns: DataTableColumn<MyData>[] = [
  {
    accessorKey: "name",
    header: "Tên",
    filter: { placeholder: "Lọc theo tên..." },
    searchable: true,
  },
  {
    accessorKey: "email",
    header: "Email",
    filter: { placeholder: "Lọc theo email..." },
    searchable: true,
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    filter: {
      type: "command",
      placeholder: "Tất cả trạng thái",
      searchPlaceholder: "Tìm kiếm trạng thái...",
      emptyMessage: "Không tìm thấy trạng thái",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Pending", value: "pending" },
      ],
    },
    cell: (row) => (
      <span className={row.status === "active" ? "text-emerald-600" : "text-rose-600"}>
        {row.status}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Ngày tạo",
    filter: {
      type: "date",
      placeholder: "Chọn ngày tạo",
      dateFormat: "dd/MM/yyyy",
    },
    cell: (row) => new Date(row.createdAt).toLocaleString("vi-VN"),
  },
]

const loader: DataTableLoader<MyData> = async (query: DataTableQueryState) => {
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

  const response = await fetch(`/api/data?${params}`, { cache: "no-store" })
  if (!response.ok) throw new Error("Failed to fetch data")

  const payload = await response.json()

  return {
    rows: payload.data as MyData[],
    page: payload.pagination.page,
    limit: payload.pagination.limit,
    total: payload.pagination.total,
    totalPages: payload.pagination.totalPages,
  }
}

export function MyDataTable() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  return (
    <DataTable
      columns={columns}
      loader={loader}
      enableSearch
      getRowId={(row) => row.id}
      emptyMessage="Không có dữ liệu"
      selection={{
        enabled: true,
        selectedIds,
        onSelectionChange: ({ ids }) => setSelectedIds(ids),
      }}
      selectionActions={({ selectedIds, clearSelection }) => (
        <div className="flex items-center justify-between">
          <span>Đã chọn {selectedIds.length} bản ghi</span>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Bỏ chọn
          </Button>
        </div>
      )}
    />
  )
}
```

## Server-side bootstrap with cache

```tsx
import { listUsersCached } from "@/features/users/server/queries"
import type { DataTableResult } from "@/components/data-table"
import { UsersTableClient, type UserRow } from "@/features/users/components/users-table.client"

export async function UsersTableShell() {
  const initial = await listUsersCached(1, 10, "", "", "active")
  const initialData: DataTableResult<UserRow> = {
    page: initial.pagination.page,
    limit: initial.pagination.limit,
    total: initial.pagination.total,
    totalPages: initial.pagination.totalPages,
    rows: initial.data.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
      roles: user.roles,
    })),
  }

  return <UsersTableClient initialData={initialData} />
}
```

Server component fetches dữ liệu bằng `cache()` và truyền `initialData` xuống client component để DataTable render ngay lập tức, sau đó các thao tác tiếp theo vẫn dùng loader/fetch thông qua API.

## Ví dụ API với Prisma

```typescript
// GET /api/users
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")
  const search = searchParams.get("search") || ""

  const columnFilters: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key.startsWith("filter[")) {
      const columnKey = key.replace("filter[", "").replace("]", "")
      columnFilters[columnKey] = value
    }
  })

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    OR: search
      ? [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  }

  if (columnFilters.email) {
    where.email = { contains: columnFilters.email, mode: "insensitive" }
  }
  if (columnFilters.isActive) {
    where.isActive = columnFilters.isActive === "true"
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
```

## Các loại Filter

DataTable hỗ trợ 4 loại filter:

### 1. Text Filter (mặc định)
```typescript
filter: {
  type: "text", // hoặc bỏ qua type
  placeholder: "Lọc email...",
}
```

### 2. Select Filter (Dropdown đơn giản)
```typescript
filter: {
  type: "select",
  placeholder: "Tất cả trạng thái",
  options: [
    { label: "Hoạt động", value: "true" },
    { label: "Ngưng hoạt động", value: "false" },
  ],
}
```

### 3. Date Filter (Date Picker)
```typescript
// Date picker chỉ ngày
filter: {
  type: "date",
  placeholder: "Chọn ngày",
  dateFormat: "dd/MM/yyyy", // Tùy chọn, mặc định: "dd/MM/yyyy"
}

// Date picker với giờ/phút
filter: {
  type: "date",
  placeholder: "Chọn ngày giờ",
  dateFormat: "dd/MM/yyyy HH:mm", // Tùy chọn
  enableTime: true,
}

// Date picker với giờ/phút/giây
filter: {
  type: "date",
  placeholder: "Chọn ngày giờ",
  dateFormat: "dd/MM/yyyy HH:mm:ss", // Tùy chọn
  enableTime: true,
  showSeconds: true,
}
```

**Lưu ý:** 
- Date filter (không có `enableTime`) trả về giá trị theo format `yyyy-MM-dd` trong `query.filters`.
- Date filter với `enableTime: true` (không có `showSeconds`) trả về format `yyyy-MM-ddTHH:mm`.
- Date filter với `enableTime: true` và `showSeconds: true` trả về format `yyyy-MM-ddTHH:mm:ss`.

### 4. Command Filter (Combobox với search)
```typescript
filter: {
  type: "command",
  placeholder: "Chọn...",
  searchPlaceholder: "Tìm kiếm...", // Tùy chọn
  emptyMessage: "Không tìm thấy.", // Tùy chọn
  options: [
    { label: "Option 1", value: "opt1" },
    { label: "Option 2", value: "opt2" },
  ],
}
```

Command filter phù hợp cho danh sách options dài cần tìm kiếm.

## Ẩn/Hiện Bộ Lọc

### Ẩn bộ lọc cho một cột cụ thể

Để ẩn bộ lọc cho một cột, đơn giản là không định nghĩa thuộc tính `filter` trong cấu hình cột:

```typescript
const columns: DataTableColumn<UserRow>[] = [
  {
    accessorKey: "email",
    header: "Email",
    // Không có filter → cột này sẽ không có bộ lọc
  },
  {
    accessorKey: "name",
    header: "Tên",
    filter: { placeholder: "Lọc tên..." }, // Có filter → hiển thị bộ lọc
  },
]
```

### Ẩn toàn bộ hàng bộ lọc

Nếu không có cột nào có `filter`, hàng bộ lọc sẽ tự động bị ẩn:

```typescript
const columns: DataTableColumn<UserRow>[] = [
  {
    accessorKey: "email",
    header: "Email",
    // Không có filter
  },
  {
    accessorKey: "name",
    header: "Tên",
    // Không có filter
  },
]
// → Không có hàng bộ lọc nào được hiển thị
```

### Nút "Ẩn/Hiện bộ lọc"

Nút **"Ẩn/Hiện bộ lọc"** sẽ tự động xuất hiện ở phía trên bảng (kế bên nút "Xóa bộ lọc") khi có ít nhất một cột được định nghĩa với thuộc tính `filter`.

**Chức năng:**
- **Khi bộ lọc đang hiển thị:** Nút sẽ hiển thị "Ẩn bộ lọc" với icon `EyeOff`. Nhấp vào sẽ ẩn toàn bộ hàng filter.
- **Khi bộ lọc đang ẩn:** Nút sẽ hiển thị "Hiện bộ lọc" với icon `Eye`. Nhấp vào sẽ hiển thị lại hàng filter.

**Lưu ý:** 
- Nút này chỉ xuất hiện khi có ít nhất một cột có `filter` được định nghĩa.
- Trạng thái ẩn/hiện được lưu trong component state (không persist qua refresh).
- Khi ẩn bộ lọc, các filter đã áp dụng vẫn hoạt động bình thường, chỉ là UI filter row bị ẩn.

### Nút "Xóa bộ lọc"

Nút **"Xóa bộ lọc"** sẽ tự động xuất hiện ở phía trên bảng khi:
- Có giá trị trong ô tìm kiếm (search), hoặc
- Có ít nhất một filter đang được áp dụng, hoặc
- Có giá trị đang được nhập trong các ô filter (pending filters)

Nhấp vào nút này sẽ:
- Xóa toàn bộ giá trị search
- Xóa tất cả các filter đã áp dụng
- Reset về trang đầu tiên

**Lưu ý:** Nếu bạn muốn ẩn bộ lọc cho một cột nhưng vẫn giữ cột đó trong bảng, chỉ cần không thêm `filter` vào cấu hình cột. Bộ lọc chỉ hiển thị khi cột có thuộc tính `filter` được định nghĩa.

## Best practices

1. **Memo hóa columns & loader** bằng `useMemo`/`useCallback` để tránh re-render không cần thiết.
2. **Luôn trả về `total` & `totalPages`** từ API để pagination chính xác.
3. **Xử lý lỗi trong loader** – ném lỗi để DataTable fallback sang trạng thái rỗng (và log ở console).
4. **Sử dụng `refreshKey`** khi cần reload bảng sau thao tác CRUD bên ngoài.
5. **Giới hạn filters cần thiết** để giao diện gọn gàng; tránh hiển thị quá nhiều bộ lọc.
6. **Chọn loại filter phù hợp:**
   - `text`: Cho các trường text cần tìm kiếm theo từ khóa
   - `select`: Cho danh sách options ngắn (< 10 items)
   - `command`: Cho danh sách options dài (> 10 items) cần search
   - `date`: Cho các trường ngày tháng
7. **Ẩn filter khi không cần thiết:** Chỉ thêm `filter` cho các cột thực sự cần lọc. Việc này giúp giao diện gọn gàng và tải nhanh hơn.

Tham khảo triển khai thực tế tại `src/features/users/components/users-table.tsx`.
