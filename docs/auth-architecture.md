# Kiến trúc Xử lý Session và Redirect - Next.js 16 + NextAuth

## Tổng quan

Hệ thống xử lý authentication và authorization theo chuẩn Next.js 16 và NextAuth best practices, với 4 layers phân tách rõ ràng:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Proxy (Edge Runtime)                                │
│    - Optimistic checks: decrypt session từ cookie      │
│    - Quick redirects                                    │
│    - KHÔNG làm database checks                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Layouts (Server Components)                          │
│    - Fetch session với getSession()                     │
│    - KHÔNG redirect (vì Partial Rendering)               │
│    - Pass data xuống children                           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 3. PermissionRouter (Client Component)                  │
│    - Validate session với useSession()                   │
│    - Permission checks chi tiết                         │
│    - Redirects nếu cần                                  │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 4. DAL (Data Access Layer)                            │
│    - Security checks chính khi fetch data               │
│    - Database validation                                │
│    - API route wrappers                                │
└─────────────────────────────────────────────────────────┘
```

## 1. Proxy (Edge Runtime) - `proxy.ts`

### Runtime: Edge Runtime (mặc định)

Theo [Next.js 16 docs](https://nextjs.org/docs/app/getting-started/proxy):
- Proxy mặc định chạy ở Edge Runtime
- Edge Runtime = Vercel Edge Network, Cloudflare Workers, hoặc edge servers
- Chạy ở network boundary, gần client hơn (lower latency)

### Chức năng: Optimistic Checks

**Theo Next.js 16 best practices:**
- Proxy làm "optimistic checks" - decrypt session từ cookie
- Proxy KHÔNG làm database checks hoặc full session validation
- Proxy chỉ decrypt JWT từ cookie để redirect sớm
- Security checks chính được làm ở DAL

**Use cases:**
- Quick redirects sau khi decrypt session từ cookie
- Tránh render không cần thiết
- KHÔNG dùng cho slow data fetching
- KHÔNG dùng như full session management solution

### Implementation:

```typescript
// Optimistic check: Decrypt session từ cookie
let hasValidSession = false
try {
  const session = await auth() // NextAuth v5 có thể decrypt trong Edge Runtime
  hasValidSession = Boolean(session?.user)
} catch {
  hasValidSession = false
}

// Quick redirects dựa trên optimistic check
if (!hasValidSession && isAdminPage) {
  return NextResponse.redirect(signInUrl)
}
```

## 2. Layouts (Server Components)

### Nguyên tắc: KHÔNG redirect

**Theo Next.js 16 best practices:**
- Layouts không nên làm auth checks và redirects (vì Partial Rendering)
- Layouts chỉ fetch user data và pass xuống children
- Auth redirects được xử lý bởi Proxy sớm trong request pipeline

### Implementation:

```typescript
// Admin Layout
export default async function AdminLayout({ children }) {
  // Chỉ fetch session data, không check auth và redirect
  const session = await getSession()
  
  return <SidebarProvider>{children}</SidebarProvider>
}
```

## 3. PermissionRouter (Client Component)

### Chức năng: Permission-based Routing

**Theo NextAuth best practices:**
- Validate session với `useSession()` từ NextAuth
- Check permissions chi tiết
- Redirect nếu không có quyền truy cập

### Implementation:

```typescript
function PermissionRouter({ children }) {
  const { data: session, status } = useSession()
  
  // Validate session và permissions
  if (!hasSession || status !== "authenticated") {
    // Redirect về sign-in
  }
  
  // Check permissions cho admin routes
  if (isAdminRoute && !hasPermission) {
    // Redirect về dashboard hoặc home
  }
}
```

## 4. DAL (Data Access Layer)

### Security Checks chính

**Theo Next.js 16 best practices:**
- Security checks chính nên ở DAL
- Database validation khi fetch data
- API route wrappers với `createApiRoute`

### Implementation:

```typescript
// API Route với security checks
export const GET = createApiRoute(
  async (req, { session, permissions }) => {
    // Security checks chính ở đây
    // Database validation
    // Return data
  },
  { permissions: [PERMISSIONS.users.read] }
)
```

## Flow xử lý Request

### Case 1: Chưa đăng nhập truy cập `/admin/users`

```
1. Proxy (Edge Runtime)
   ├─> Decrypt session từ cookie → Không có session
   └─> Redirect → /auth/sign-in?callbackUrl=/admin/users
   
2. Layout (Server Component)
   └─> (Không được render vì đã redirect ở Proxy)

3. PermissionRouter
   └─> (Không được render vì đã redirect ở Proxy)
```

### Case 2: Đã đăng nhập truy cập `/auth/sign-in`

```
1. Proxy (Edge Runtime)
   ├─> Decrypt session từ cookie → Có session
   └─> Redirect → /admin/dashboard (hoặc callbackUrl)
   
2. Layout (Server Component)
   └─> (Không được render vì đã redirect ở Proxy)

3. PermissionRouter
   └─> (Không được render vì đã redirect ở Proxy)
```

### Case 3: Đã đăng nhập nhưng không có permission

```
1. Proxy (Edge Runtime)
   ├─> Decrypt session từ cookie → Có session
   └─> Pass through → Continue to layout

2. Layout (Server Component)
   ├─> Fetch session với getSession()
   └─> Render children

3. PermissionRouter (Client Component)
   ├─> Validate session với useSession()
   ├─> Check permissions → Không có quyền
   └─> Redirect → /admin/dashboard (hoặc home)
```

## Best Practices

### ✅ Nên làm:

1. **Proxy**: Optimistic checks, quick redirects
2. **Layouts**: Fetch session, không redirect
3. **PermissionRouter**: Validate session và permissions ở client-side
4. **DAL**: Security checks chính khi fetch data

### ❌ Không nên làm:

1. **Proxy**: Database checks, full session validation
2. **Layouts**: Auth checks, redirects (vì Partial Rendering)
3. **PermissionRouter**: Database checks (dùng session data từ NextAuth)
4. **DAL**: Bỏ qua security checks

## Tài liệu tham khảo

- [Next.js 16 Proxy](https://nextjs.org/docs/app/getting-started/proxy)
- [Next.js 16 Proxy API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Next.js 16 Migration Guide](https://nextjs.org/docs/app/guides/upgrading/codemods#middleware-to-proxy)
- [NextAuth.js Documentation](https://authjs.dev)

