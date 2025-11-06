# DataTable Component - Hướng dẫn sử dụng

`DataTable` là component bảng dữ liệu tái sử dụng, tích hợp Suspense của React 19 / Next.js 16 để xử lý load dữ liệu bất đồng bộ. Component hỗ trợ:

- Pagination server-side với `page`, `limit`, `total`, `totalPages`
- Search toàn bảng (thông qua `query.search` trong loader)
- Filter theo từng cột (text, select, date picker, hoặc command/combobox)
- Tùy biến cell renderer cho từng cột
- Gắn actions theo từng dòng (edit/delete...)
- Lựa chọn nhiều dòng, chọn tất cả và hiển thị bulk actions
- Làm việc trực tiếp với dữ liệu Prisma thông qua loader
- Server-side bootstrap với `initialData` để tối ưu performance

## Cấu trúc thư mục

```
src/
├── components/
│   └── tables/
│       └── data-table.tsx                # DataTable generics kèm Suspense + selection
└── features/
    └── users/
        ├── components/
        │   ├── users-table.tsx           # Server Component (fetch initial data)
        │   └── users-table.client.tsx    # Client Component (DataTable wrapper)
        └── server/
            ├── queries.ts                # Non-cached queries
            └── cache.ts                  # Cached queries với React.cache()
```

## 1. Định nghĩa Columns

Sử dụng `DataTableColumn<T>` để mô tả mỗi cột:

```typescript
import { type DataTableColumn } from "@/components/tables/data-table"

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
  },
  {
    accessorKey: "name",
    header: "Tên",
    filter: { placeholder: "Lọc tên..." },
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

**Lưu ý:**
- `accessorKey`: Phải là key của object type `T`
- `header`: Tiêu đề cột
- `cell`: Optional renderer function, mặc định hiển thị raw value
- `filter`: Optional filter configuration
- `className`: Optional CSS class cho cell
- `headerClassName`: Optional CSS class cho header

## 2. Viết loader (server-side)

`DataTable` nhận một `loader` dạng `DataTableLoader<T>`, chạy mỗi khi người dùng đổi page/limit/search/filter. Loader nên gọi API hoặc hành động server khác và trả về:

```typescript
import type {
  DataTableLoader,
  DataTableQueryState,
  DataTableResult,
} from "@/components/tables/data-table"

const loader: DataTableLoader<UserRow> = async (
  query: DataTableQueryState,
): Promise<DataTableResult<UserRow>> => {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  })

  // Search toàn bảng (nếu có)
  if (query.search.trim()) {
    params.set("search", query.search.trim())
  }

  // Column filters
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

**DataTableQueryState:**
```typescript
interface DataTableQueryState {
  page: number          // Trang hiện tại (bắt đầu từ 1)
  limit: number         // Số bản ghi mỗi trang
  search: string        // Search toàn bảng (có thể implement UI riêng)
  filters: Record<string, string>  // Column filters
}
```

**DataTableResult:**
```typescript
interface DataTableResult<T> {
  rows: T[]             // Dữ liệu rows
  page: number          // Trang hiện tại
  limit: number         // Số bản ghi mỗi trang
  total: number         // Tổng số bản ghi
  totalPages: number    // Tổng số trang
}
```

> **Ghi chú:** Loader có thể gọi trực tiếp Prisma trong Server Component hoặc thông qua API route. Chỉ cần đảm bảo trả về đúng schema trên.

## 3. Render DataTable

```tsx
"use client"

import { useState } from "react"
import { DataTable, type DataTableSelectionChange } from "@/components/tables/data-table"

export function UsersTableClient({ canManage }: { canManage: boolean }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleSelectionChange = (change: DataTableSelectionChange<UserRow>) => {
    setSelectedIds(change.ids)
  }

  return (
    <DataTable
      columns={columns}
      loader={loader}
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
              <MoreHorizontal className="h-5 w-5" />
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

## 4. Server-side bootstrap với initialData

Để tối ưu performance, có thể fetch dữ liệu ban đầu ở Server Component và truyền vào `initialData`:

```tsx
// Server Component
import { listUsersCached } from "@/features/users/server/cache"
import type { DataTableResult } from "@/components/tables/data-table"
import { UsersTableClient, type UserRow } from "@/features/users/components/users-table.client"

export async function UsersTable() {
  // Fetch initial data với cached query
  const initial = await listUsersCached({
    page: 1,
    limit: 10,
    search: "",
    filters: {},
  })
  
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

**Lợi ích:**
- Render ngay lập tức với dữ liệu ban đầu (không cần loading state)
- Tận dụng React Server Components và caching
- Các thao tác tiếp theo (pagination, filter) vẫn dùng loader/fetch thông qua API

## 5. Props API

### DataTableProps

```typescript
interface DataTableProps<T extends object> {
  // Required
  columns: DataTableColumn<T>[]           // Định nghĩa cột
  loader: DataTableLoader<T>              // Function load dữ liệu

  // Optional
  actions?: (row: T) => ReactNode         // Renderer cho cột hành động
  className?: string                      // CSS class cho container
  initialFilters?: Record<string, string> // Filters ban đầu
  initialPage?: number                    // Trang ban đầu (mặc định: 1)
  initialLimit?: number                   // Limit ban đầu
  limitOptions?: number[]                 // Tùy chỉnh page size options (mặc định: [10, 20, 50])
  emptyMessage?: string                   // Message khi không có dữ liệu (mặc định: "Không có dữ liệu")
  getRowId?: (row: T, index: number) => string  // Function lấy ID cho row (mặc định: row.id hoặc JSON.stringify)
  refreshKey?: number | string            // Key để force reload dữ liệu
  fallbackRowCount?: number               // Số rows trong skeleton (mặc định: 5)
  initialData?: DataTableResult<T>        // Dữ liệu ban đầu (server-side bootstrap)
  selection?: DataTableSelectionConfig<T> // Cấu hình selection
  selectionActions?: (context: {
    selectedIds: string[]
    selectedRows: T[]
    clearSelection: () => void
  }) => ReactNode                         // Renderer cho bulk actions
  maxHeight?: string | number             // Max height cho table
  enableHorizontalScroll?: boolean        // Enable horizontal scroll (mặc định: true)
  maxWidth?: string | number              // Max width cho table
}
```

### DataTableSelectionConfig

```typescript
interface DataTableSelectionConfig<T extends object> {
  enabled: boolean                        // Bật/tắt selection
  selectedIds?: string[]                 // Controlled selected IDs
  defaultSelectedIds?: string[]           // Default selected IDs (uncontrolled)
  onSelectionChange?: (change: DataTableSelectionChange<T>) => void  // Callback khi selection thay đổi
  isRowSelectable?: (row: T) => boolean  // Function kiểm tra row có thể select không
  disabled?: boolean                      // Disable selection
}
```

### DataTableColumn

```typescript
interface DataTableColumn<T extends object> {
  accessorKey: keyof T & string           // Key của object type T
  header: string                          // Tiêu đề cột
  cell?: (row: T) => ReactNode            // Custom cell renderer
  filter?: ColumnFilterConfig             // Filter configuration
  className?: string                      // CSS class cho cell
  headerClassName?: string                // CSS class cho header
}
```

## 6. Các loại Filter

DataTable hỗ trợ 4 loại filter:

### 1. Text Filter (mặc định)

```typescript
filter: {
  type: "text", // hoặc bỏ qua type
  placeholder: "Lọc email...",
}
```

- Input text đơn giản
- Debounced (300ms) để tránh quá nhiều requests
- Phù hợp cho các trường text cần tìm kiếm theo từ khóa

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

- Native HTML `<select>` element
- Phù hợp cho danh sách options ngắn (< 10 items)
- Apply ngay lập tức khi chọn

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

**Lưu ý về Date Format:**
- Date filter (không có `enableTime`) trả về giá trị theo format `yyyy-MM-dd` trong `query.filters`.
- Date filter với `enableTime: true` (không có `showSeconds`) trả về format `yyyy-MM-ddTHH:mm`.
- Date filter với `enableTime: true` và `showSeconds: true` trả về format `yyyy-MM-ddTHH:mm:ss`.

### 4. Command Filter (Combobox với search)

```typescript
filter: {
  type: "command",
  placeholder: "Chọn...",
  searchPlaceholder: "Tìm kiếm...", // Tùy chọn, mặc định: "Tìm kiếm..."
  emptyMessage: "Không tìm thấy.", // Tùy chọn, mặc định: "Không tìm thấy."
  options: [
    { label: "Option 1", value: "opt1" },
    { label: "Option 2", value: "opt2" },
  ],
}
```

- Combobox với search functionality
- Phù hợp cho danh sách options dài (> 10 items) cần tìm kiếm
- Apply ngay lập tức khi chọn
- Sử dụng Popover + Command component từ shadcn/ui

## 7. Ẩn/Hiện Bộ Lọc

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
- Có giá trị trong `query.search` (search toàn bảng), hoặc
- Có ít nhất một filter đang được áp dụng, hoặc
- Có giá trị đang được nhập trong các ô filter (pending filters)

Nhấp vào nút này sẽ:
- Xóa toàn bộ giá trị search (nếu có)
- Xóa tất cả các filter đã áp dụng
- Reset về trang đầu tiên

## 8. Search Toàn Bảng

DataTable hỗ trợ search toàn bảng thông qua `query.search` trong `DataTableQueryState`. Tuy nhiên, component không có UI search input mặc định. Bạn có thể:

1. **Implement search UI riêng** và cập nhật `query.search` thông qua state management
2. **Sử dụng search trong loader** để xử lý search logic ở server-side

**Ví dụ implement search UI:**

```tsx
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/tables/data-table"

export function UsersTableWithSearch() {
  const [search, setSearch] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const loader: DataTableLoader<UserRow> = async (query) => {
    // Merge search từ state vào query
    const queryWithSearch = { ...query, search }
    // ... rest of loader logic
  }

  return (
    <div>
      <Input
        placeholder="Tìm kiếm..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setRefreshKey((prev) => prev + 1) // Force reload
        }}
      />
      <DataTable
        columns={columns}
        loader={loader}
        refreshKey={refreshKey}
      />
    </div>
  )
}
```

## 9. Ví dụ API với Prisma

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
  if (columnFilters.createdAt) {
    // Parse date filter (format: yyyy-MM-dd hoặc yyyy-MM-ddTHH:mm)
    const dateValue = new Date(columnFilters.createdAt)
    where.createdAt = {
      gte: new Date(dateValue.setHours(0, 0, 0, 0)),
      lte: new Date(dateValue.setHours(23, 59, 59, 999)),
    }
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

## 10. Quick Start Example

```typescript
"use client"

import { useState } from "react"
import {
  DataTable,
  type DataTableColumn,
  type DataTableLoader,
  type DataTableQueryState,
} from "@/components/tables/data-table"
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
  },
  {
    accessorKey: "email",
    header: "Email",
    filter: { placeholder: "Lọc theo email..." },
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

## 11. Best Practices

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
8. **Sử dụng `initialData`** để tối ưu performance với server-side bootstrap.
9. **Debounced filters:** Text filters được debounce tự động (300ms) để tránh quá nhiều requests.
10. **Type safety:** Luôn định nghĩa type cho row data (`UserRow`, `MyData`, etc.) để đảm bảo type safety.

Tham khảo triển khai thực tế tại `src/features/users/components/users-table.tsx` và `src/features/users/components/users-table.client.tsx`.
