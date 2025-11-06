# Kiến trúc Xử lý Authentication và Authorization - Next.js 16 + NextAuth

## 📋 Tổng quan

Hệ thống xử lý authentication và authorization theo chuẩn Next.js 16 và NextAuth best practices, với 4 layers phân tách rõ ràng:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Proxy (Edge Runtime)                                │
│    - CORS validation                                    │
│    - Maintenance mode check                             │
│    - IP whitelist cho admin routes                      │
│    - Security headers                                   │
│    - KHÔNG làm authentication redirects                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Layouts (Server Components)                          │
│    - Fetch session với getSession()                     │
│    - KHÔNG redirect (vì Partial Rendering)              │
│    - Pass data xuống children                           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 3. PermissionGate (Server → Client)                    │
│    - Server: Fetch permissions                          │
│    - Client: Validate session với useSession()          │
│    - Client: Permission checks chi tiết                │
│    - Client: Redirects nếu cần                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 4. API Routes (DAL - Data Access Layer)                │
│    - Security checks chính khi fetch data               │
│    - Database validation                                │
│    - API route wrappers với createApiRoute             │
└─────────────────────────────────────────────────────────┘
```

## 1. Proxy (Edge Runtime) - `proxy.ts`

### Runtime: Edge Runtime (mặc định)

Theo [Next.js 16 docs](https://nextjs.org/docs/app/getting-started/proxy):
- Proxy mặc định chạy ở Edge Runtime
- Edge Runtime = Vercel Edge Network, Cloudflare Workers, hoặc edge servers
- Chạy ở network boundary, gần client hơn (lower latency)

### Chức năng: Infrastructure & Security

**Theo Next.js 16 best practices:**
- Proxy KHÔNG làm authentication redirects
- Proxy chỉ xử lý infrastructure concerns (CORS, maintenance, IP whitelist)
- Authentication redirects được xử lý bởi PermissionGateClient ở client-side

**Use cases:**
- CORS validation
- Maintenance mode check
- IP whitelist cho admin routes
- Proxy API requests đến external APIs
- Security headers
- Static asset caching

**KHÔNG làm:**
- ❌ Authentication checks
- ❌ Session validation
- ❌ Auth redirects
- ❌ Database checks

### Implementation:

```typescript
// proxy.ts
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. CORS Check
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 })
  }

  // 2. Maintenance Mode Check
  if (MAINTENANCE_MODE && !checkMaintenanceMode(request)) {
    return NextResponse.redirect(new URL("/maintenance", request.url))
  }

  // 3. IP Whitelist Check for Admin Routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const clientIP = getClientIP(request)
    if (!checkIPWhitelist(clientIP)) {
      return NextResponse.json({ error: "IP address not allowed" }, { status: 403 })
    }
  }

  // 4. Skip proxy for NextAuth routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // 5. Security Headers
  const response = NextResponse.next()
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  // ... more headers

  return response
}

// Note: Authentication redirects được xử lý bởi PermissionGateClient ở client-side
```

## 2. Layouts (Server Components)

### Nguyên tắc: KHÔNG redirect

**Theo Next.js 16 best practices:**
- Layouts không nên làm auth checks và redirects (vì Partial Rendering)
- Layouts chỉ fetch user data và pass xuống children
- Auth redirects được xử lý bởi PermissionGateClient ở client-side

### Implementation:

#### Admin Layout

```typescript
// src/app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  // Chỉ fetch session data, KHÔNG check auth và redirect
  await getSession()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
```

**Lưu ý:**
- Admin Layout KHÔNG có PermissionGate wrapper
- Permission checking được xử lý ở page level hoặc PermissionGateClient

#### Auth Layout

```typescript
// src/app/auth/layout.tsx
export default async function AuthLayout({ children }) {
  await getSession()

  return (
    <>
      <PublicHeader />
      <div className="...">
        <PermissionGate>
          {children}
        </PermissionGate>
      </div>
    </>
  )
}
```

**Lưu ý:**
- Auth Layout có PermissionGate wrapper để:
  - Redirect authenticated users away from auth pages
  - Block access nếu đã đăng nhập

#### Root Layout

```typescript
// src/app/layout.tsx
export default async function RootLayout({ children }) {
  const session = await auth()

  return (
    <html>
      <body>
        <Providers initialSession={session}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

## 3. PermissionGate (Server → Client Pattern)

### Chức năng: Permission-based Access Control

**Theo NextAuth best practices:**
- Server Component: Fetch permissions từ database
- Client Component: Validate session với `useSession()` từ NextAuth
- Client Component: Check permissions chi tiết
- Client Component: Redirect nếu không có quyền truy cập

### Implementation:

#### PermissionGate (Server Component)

```typescript
// src/components/shared/permission/gate/permission-gate.tsx
export async function PermissionGate({ children }: { children: React.ReactNode }) {
  // Lấy session và permissions ở server-side
  const session = await getSession()
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  // Pass session data xuống Client Component để check permission với pathname
  return (
    <PermissionGateClient permissions={permissions} roles={roles}>
      {children}
    </PermissionGateClient>
  )
}
```

#### PermissionGateClient (Client Component)

```typescript
// src/components/shared/permission/gate/permission-gate-client.tsx
"use client"

export function PermissionGateClient({ children, permissions, roles }) {
  const pathname = usePathname()
  const router = useRouter()
  const { status } = useSession()

  // Redirect unauthenticated users to sign-in
  useEffect(() => {
    if (status === "unauthenticated" && pathname?.startsWith("/admin")) {
      const callbackUrl = encodeURIComponent(pathname)
      router.push(`/auth/sign-in?callbackUrl=${callbackUrl}`)
    }
  }, [pathname, status, router])

  // Block auth routes when authenticated
  if (status === "authenticated" && pathname?.startsWith("/auth")) {
    return <ForbiddenNotice title="Đã đăng nhập" message="..." />
  }

  // Permission checks (only for authenticated users)
  if (status === "authenticated") {
    const requiredPermissions = getRoutePermissions(pathname)
    if (requiredPermissions.length > 0 && !canPerformAnyAction(permissions, roles, requiredPermissions)) {
      return <ForbiddenNotice />
    }
  }

  return <>{children}</>
}
```

**Chức năng:**
1. ✅ Redirect unauthenticated users từ `/admin/*` → `/auth/sign-in`
2. ✅ Block authenticated users từ `/auth/*` (hiển thị ForbiddenNotice)
3. ✅ Check permissions dựa trên route pathname
4. ✅ Hiển thị ForbiddenNotice nếu không có quyền

## 4. API Routes (DAL - Data Access Layer)

### Security Checks chính

**Theo Next.js 16 best practices:**
- Security checks chính nên ở DAL (API routes)
- Database validation khi fetch data
- API route wrappers với `createApiRoute`

### Implementation:

```typescript
// src/app/api/admin/users/route.ts
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"

async function getUsersHandler(req: NextRequest, context: ApiRouteContext) {
  // Handler logic
  return NextResponse.json({ data: users })
}

// Tự động áp dụng: authentication, authorization, rate limiting, security headers
export const GET = createGetRoute(getUsersHandler)
export const POST = createPostRoute(postUsersHandler)
```

**API Route Wrapper tự động:**
1. ✅ Authentication check (requireAuth)
2. ✅ Authorization check (auto-detect permissions từ ROUTE_CONFIG)
3. ✅ Rate limiting (dựa trên HTTP method)
4. ✅ Security headers
5. ✅ Error handling

## 🔄 Flow xử lý Request

### Case 1: Chưa đăng nhập truy cập `/admin/users`

```
1. Proxy (Edge Runtime)
   ├─> CORS check → Pass
   ├─> Maintenance check → Pass
   ├─> IP whitelist check → Pass
   └─> Continue → Layout

2. Admin Layout (Server Component)
   ├─> Fetch session với getSession() → null
   └─> Render children (không redirect)

3. PermissionGateClient (Client Component)
   ├─> useSession() → status: "unauthenticated"
   ├─> Check pathname → startsWith("/admin")
   └─> Redirect → /auth/sign-in?callbackUrl=/admin/users
```

### Case 2: Đã đăng nhập truy cập `/auth/sign-in`

```
1. Proxy (Edge Runtime)
   ├─> CORS check → Pass
   └─> Continue → Layout

2. Auth Layout (Server Component)
   ├─> Fetch session với getSession() → có session
   └─> Render PermissionGate wrapper

3. PermissionGate (Server Component)
   ├─> Fetch permissions
   └─> Pass xuống PermissionGateClient

4. PermissionGateClient (Client Component)
   ├─> useSession() → status: "authenticated"
   ├─> Check pathname → startsWith("/auth")
   └─> Block access → Hiển thị ForbiddenNotice
```

### Case 3: Đã đăng nhập nhưng không có permission

```
1. Proxy (Edge Runtime)
   └─> Continue → Layout

2. Admin Layout (Server Component)
   ├─> Fetch session với getSession() → có session
   └─> Render children

3. Page (Server Component)
   ├─> Fetch permissions
   └─> Render PermissionGate (nếu có)

4. PermissionGateClient (Client Component)
   ├─> useSession() → status: "authenticated"
   ├─> Check permissions → getRoutePermissions(pathname)
   ├─> canPerformAnyAction() → false
   └─> Hiển thị ForbiddenNotice
```

### Case 4: API Request - Không có permission

```
1. Proxy (Edge Runtime)
   └─> Continue → API Route

2. API Route Handler
   ├─> createGetRoute() wrapper:
   │   ├─> requireAuth() → Pass (có session)
   │   ├─> Auto-detect permissions từ ROUTE_CONFIG
   │   ├─> Check permissions → Fail
   │   └─> Return 403 Forbidden
   └─> (Handler không được gọi)
```

## 📝 Best Practices

### ✅ Nên làm:

1. **Proxy**: Infrastructure concerns (CORS, maintenance, IP whitelist, security headers)
2. **Layouts**: Fetch session, không redirect
3. **PermissionGate**: Validate session và permissions ở client-side, redirect nếu cần
4. **API Routes**: Security checks chính khi fetch data với `createApiRoute` wrapper

### ❌ Không nên làm:

1. **Proxy**: Authentication checks, session validation, auth redirects
2. **Layouts**: Auth checks, redirects (vì Partial Rendering)
3. **PermissionGate**: Database checks (dùng session data từ NextAuth)
4. **API Routes**: Bỏ qua security checks (luôn dùng `createApiRoute` wrapper)

## 🏗️ Cấu trúc Files

```
src/
├── proxy.ts                                    # Proxy (Edge Runtime)
├── app/
│   ├── layout.tsx                             # Root Layout
│   ├── admin/
│   │   └── layout.tsx                         # Admin Layout (fetch session)
│   └── auth/
│       └── layout.tsx                         # Auth Layout (có PermissionGate)
├── components/
│   └── shared/
│       └── permission/
│           └── gate/
│               ├── permission-gate.tsx        # Server Component (fetch permissions)
│               └── permission-gate-client.tsx # Client Component (redirects, checks)
└── lib/
    ├── auth/
    │   ├── auth.ts                            # NextAuth config
    │   └── auth-server.ts                     # Server-side auth utilities
    └── api/
        └── api-route-wrapper.ts               # API route security wrapper
```

## 🔍 Chi tiết Implementation

### 1. Proxy - Infrastructure Layer

**File:** `proxy.ts`

**Chức năng:**
- ✅ CORS validation
- ✅ Maintenance mode check
- ✅ IP whitelist cho admin routes
- ✅ Proxy API requests đến external APIs
- ✅ Security headers
- ✅ Static asset caching
- ❌ KHÔNG làm authentication redirects

**Runtime:** Edge Runtime (mặc định)

**Matcher:**
```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
```

### 2. Layouts - Data Fetching Layer

**Files:**
- `src/app/layout.tsx` - Root Layout
- `src/app/admin/layout.tsx` - Admin Layout
- `src/app/auth/layout.tsx` - Auth Layout

**Pattern:**
```typescript
export default async function Layout({ children }) {
  // Chỉ fetch session data, KHÔNG check auth và redirect
  await getSession()
  
  return <>{children}</>
}
```

**Lưu ý:**
- Admin Layout: KHÔNG có PermissionGate wrapper
- Auth Layout: CÓ PermissionGate wrapper để block authenticated users

### 3. PermissionGate - Access Control Layer

**Files:**
- `src/components/shared/permission/gate/permission-gate.tsx` - Server Component
- `src/components/shared/permission/gate/permission-gate-client.tsx` - Client Component

**Pattern:**
```typescript
// Server Component
export async function PermissionGate({ children }) {
  const session = await getSession()
  const permissions = await getPermissions()
  const roles = session?.roles ?? []
  
  return (
    <PermissionGateClient permissions={permissions} roles={roles}>
      {children}
    </PermissionGateClient>
  )
}

// Client Component
"use client"
export function PermissionGateClient({ children, permissions, roles }) {
  const pathname = usePathname()
  const { status } = useSession()
  
  // Redirect logic
  // Permission checks
  // Render children hoặc ForbiddenNotice
}
```

**Chức năng:**
1. Redirect unauthenticated users từ `/admin/*` → `/auth/sign-in`
2. Block authenticated users từ `/auth/*`
3. Check permissions dựa trên route pathname
4. Hiển thị ForbiddenNotice nếu không có quyền

### 4. API Routes - Security Layer

**File:** `src/lib/api/api-route-wrapper.ts`

**Pattern:**
```typescript
// Tự động áp dụng: authentication, authorization, rate limiting, security headers
export const GET = createGetRoute(getUsersHandler)
export const POST = createPostRoute(postUsersHandler)
```

**Tự động:**
1. ✅ Authentication check (requireAuth)
2. ✅ Authorization check (auto-detect từ ROUTE_CONFIG)
3. ✅ Rate limiting (dựa trên HTTP method)
4. ✅ Security headers
5. ✅ Error handling

## 📊 So sánh: Tài liệu cũ vs Thực tế

| Layer | Tài liệu cũ | Thực tế |
|-------|-------------|---------|
| **Proxy** | Decrypt session, redirects | ❌ KHÔNG làm auth redirects, chỉ infrastructure |
| **Layouts** | Fetch session, không redirect | ✅ Đúng |
| **PermissionRouter** | Client Component với redirects | ✅ Đúng (nhưng tên là PermissionGate) |
| **DAL** | Security checks chính | ✅ Đúng |

## 🎯 Key Differences

### 1. Proxy KHÔNG làm Authentication Redirects

**Tài liệu cũ (SAI):**
```typescript
// Proxy decrypt session và redirect
const session = await auth()
if (!session && isAdminPage) {
  return NextResponse.redirect(signInUrl)
}
```

**Thực tế (ĐÚNG):**
```typescript
// Proxy chỉ làm infrastructure concerns
// Note: Authentication redirects được xử lý bởi PermissionGateClient ở client-side
```

### 2. PermissionGate thay vì PermissionRouter

**Tài liệu cũ:** PermissionRouter
**Thực tế:** PermissionGate (Server Component) → PermissionGateClient (Client Component)

### 3. PermissionGate được sử dụng trong Auth Layout

**Tài liệu cũ:** Không đề cập
**Thực tế:** Auth Layout có PermissionGate wrapper để block authenticated users

## 📚 Tài liệu tham khảo

- [Next.js 16 Proxy](https://nextjs.org/docs/app/getting-started/proxy)
- [Next.js 16 Proxy API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Next.js 16 Migration Guide](https://nextjs.org/docs/app/guides/upgrading/codemods#middleware-to-proxy)
- [NextAuth.js Documentation](https://authjs.dev)
- [Next.js 16 Partial Rendering](https://nextjs.org/docs/app/building-your-application/rendering/partial-prerendering)
