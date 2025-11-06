# Security Best Practices - API Routes & System Security

Tài liệu này mô tả các biện pháp bảo mật cho API routes và hệ thống, dựa trên cấu trúc thực tế của dự án.

## 📋 Tổng quan

Hệ thống sử dụng **multi-layer security** với các lớp bảo vệ:
1. **Authentication** - Xác thực người dùng
2. **Authorization** - Phân quyền truy cập
3. **Input Validation** - Kiểm tra và làm sạch dữ liệu đầu vào
4. **Rate Limiting** - Giới hạn số lượng request
5. **Security Headers** - Headers bảo mật
6. **Error Handling** - Xử lý lỗi an toàn

## 🔐 API Route Security Architecture

### 1. API Route Wrapper (`api-route-wrapper.ts`)

Tất cả API routes phải sử dụng wrapper functions để tự động áp dụng các biện pháp bảo mật:

```typescript
// src/app/api/admin/users/route.ts
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function getUsersHandler(req: NextRequest, context: ApiRouteContext) {
  // Handler logic
  return NextResponse.json({ data: users })
}

async function postUsersHandler(req: NextRequest, context: ApiRouteContext) {
  // Handler logic
  return NextResponse.json({ data: user }, { status: 201 })
}

// Tự động áp dụng: authentication, authorization, rate limiting, security headers
export const GET = createGetRoute(getUsersHandler)
export const POST = createPostRoute(postUsersHandler)
```

**Available Wrappers:**
- `createGetRoute()` - GET requests (rate limit: read)
- `createPostRoute()` - POST requests (rate limit: write)
- `createPutRoute()` - PUT requests (rate limit: write)
- `createPatchRoute()` - PATCH requests (rate limit: write)
- `createDeleteRoute()` - DELETE requests (rate limit: write)
- `createApiRoute()` - Custom configuration

### 2. Authentication

**Tự động kiểm tra authentication** cho tất cả routes (trừ khi `requireAuth: false`):

```typescript
// Tự động check authentication
const session = await requireAuth()
const permissions = await getPermissions()
const roles = session.roles || []

// Nếu không authenticated → 401 Unauthorized
```

**Ví dụ:**

```typescript
// ✅ Protected route (default)
export const GET = createGetRoute(handler) // requireAuth: true (default)

// ✅ Public route
export const GET = createGetRoute(handler, { requireAuth: false })
```

### 3. Authorization (Permission System)

**Auto-detect permissions** từ `ROUTE_CONFIG` hoặc specify manually:

```typescript
// Pattern 1: Auto-detect từ ROUTE_CONFIG (recommended)
export const GET = createGetRoute(getUsersHandler)
// Tự động detect: GET /api/admin/users → [PERMISSIONS.USERS_VIEW]

// Pattern 2: Manual specify
export const GET = createGetRoute(getUsersHandler, {
  permissions: PERMISSIONS.USERS_VIEW,
})

// Pattern 3: Multiple permissions (OR logic)
export const POST = createPostRoute(createUserHandler, {
  permissions: [PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_MANAGE],
})
```

**Permission Checking Logic:**
- ✅ User có **bất kỳ** permission nào trong danh sách → Allowed
- ✅ Super admin (`super_admin` role) → Bypass tất cả checks (nếu `allowSuperAdmin: true`)
- ❌ Không có permission → 403 Forbidden

**Ví dụ thực tế:**

```typescript
// src/app/api/admin/users/route.ts
export const GET = createGetRoute(getUsersHandler)
// Auto-detect: GET /api/admin/users → [PERMISSIONS.USERS_VIEW]

export const POST = createPostRoute(postUsersHandler)
// Auto-detect: POST /api/admin/users → [PERMISSIONS.USERS_CREATE]
```

### 4. Rate Limiting

**Tự động áp dụng rate limiting** dựa trên endpoint type:

| Endpoint Type | Window | Max Requests | Use Case |
|--------------|--------|--------------|----------|
| `auth` | 15 phút | 5 requests | Sign-in, sign-up |
| `write` | 1 phút | 30 requests | POST, PUT, PATCH, DELETE |
| `read` | 1 phút | 100 requests | GET requests |
| `default` | 1 phút | 60 requests | Other requests |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1640995200000
Retry-After: 45
```

**Khi vượt quá limit:**
- Status: `429 Too Many Requests`
- Response: `{ error: "Too many requests", retryAfter: 45 }`

### 5. Security Headers

**Tự động thêm security headers** vào mọi response:

```typescript
// Headers được thêm tự động:
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains (production only)
```

## 🛡️ Input Validation & Sanitization

### 1. Validation Functions (`lib/api/validation.ts`)

**Luôn validate input** trước khi xử lý:

```typescript
import { validateID, validateEmail, validatePagination, sanitizeSearchQuery } from "@/lib/api/validation"

// Validate ID (UUID hoặc CUID)
const idValidation = validateID(id)
if (!idValidation.valid) {
  return NextResponse.json({ error: idValidation.error }, { status: 400 })
}

// Validate email
const emailValidation = validateEmail(email)
if (!emailValidation.valid) {
  return NextResponse.json({ error: emailValidation.error }, { status: 400 })
}

// Validate pagination
const paginationValidation = validatePagination({ page, limit })
if (!paginationValidation.valid) {
  return NextResponse.json({ error: paginationValidation.error }, { status: 400 })
}

// Sanitize search query (prevent SQL injection)
const searchValidation = sanitizeSearchQuery(search, 200)
if (!searchValidation.valid) {
  return NextResponse.json({ error: searchValidation.error }, { status: 400 })
}
```

### 2. Available Validation Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `validateID()` | Validate UUID/CUID | `validateID(userId)` |
| `validateEmail()` | Validate email format | `validateEmail(email)` |
| `validatePassword()` | Validate password strength | `validatePassword(password)` |
| `validateStringLength()` | Validate string length | `validateStringLength(name, 2, 100)` |
| `validateInteger()` | Validate integer | `validateInteger(page, 1, 1000)` |
| `validateArray()` | Validate array | `validateArray(roleIds, 0, 10)` |
| `validatePagination()` | Validate pagination | `validatePagination({ page, limit })` |
| `sanitizeSearchQuery()` | Sanitize search (prevent SQL injection) | `sanitizeSearchQuery(query, 200)` |
| `sanitizeString()` | Sanitize string input | `sanitizeString(input)` |

### 3. Request Body Validation

**Validate request body** trước khi xử lý:

```typescript
async function postUsersHandler(req: NextRequest, context: ApiRouteContext) {
  // 1. Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  // 2. Validate required fields
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email và mật khẩu là bắt buộc" }, { status: 400 })
  }

  // 3. Validate field types
  if (typeof body.email !== "string") {
    return NextResponse.json({ error: "Email phải là chuỗi" }, { status: 400 })
  }

  // 4. Validate field values
  const emailValidation = validateEmail(body.email)
  if (!emailValidation.valid) {
    return NextResponse.json({ error: emailValidation.error }, { status: 400 })
  }

  // 5. Whitelist allowed fields (prevent mass assignment)
  const allowedFields = ["email", "name", "password", "roleIds", "isActive"]
  const invalidFields = Object.keys(body).filter((key) => !allowedFields.includes(key))
  if (invalidFields.length > 0) {
    return NextResponse.json(
      { error: `Các trường không hợp lệ: ${invalidFields.join(", ")}` },
      { status: 400 }
    )
  }

  // 6. Process request
  // ...
}
```

### 4. SQL Injection Prevention

**Prisma tự động bảo vệ** khỏi SQL injection, nhưng vẫn nên validate input:

```typescript
// ✅ GOOD - Prisma parameterized queries
const user = await prisma.user.findUnique({
  where: { id: validatedId }, // Safe
})

// ✅ GOOD - Validate search query
const searchValidation = sanitizeSearchQuery(search, 200)
if (!searchValidation.valid) {
  return NextResponse.json({ error: searchValidation.error }, { status: 400 })
}

// ❌ BAD - Never do this (Prisma prevents it, but don't rely on it)
// const query = `SELECT * FROM users WHERE email = '${email}'`
```

## 🔒 Permission System

### 1. Route Configuration (`route-config.ts`)

**Centralized permission mapping** - Single source of truth:

```typescript
// src/lib/permissions/route-config.ts
export const ROUTE_CONFIG: RoutePermissionConfig[] = [
  // Auto-generate CRUD routes
  ...generateResourceRoutes({
    name: "users",
    permissions: {
      view: PERMISSIONS.USERS_VIEW,
      create: PERMISSIONS.USERS_CREATE,
      update: PERMISSIONS.USERS_UPDATE,
      delete: PERMISSIONS.USERS_DELETE,
      manage: PERMISSIONS.USERS_MANAGE,
    },
    customApi: [
      { path: "/bulk", method: "POST", permissions: [PERMISSIONS.USERS_MANAGE] },
      { path: "/[id]/restore", method: "POST", permissions: [PERMISSIONS.USERS_UPDATE] },
    ],
    adminApi: [
      { path: "", method: "GET", permissions: [PERMISSIONS.USERS_VIEW] },
      { path: "", method: "POST", permissions: [PERMISSIONS.USERS_CREATE] },
      // ...
    ],
  }),
]
```

**Auto-generates:**
- Page routes: `/admin/users`, `/admin/users/new`, `/admin/users/[id]`, `/admin/users/[id]/edit`
- API routes: `GET /api/users`, `POST /api/users`, `GET /api/users/[id]`, etc.

### 2. Permission Checking trong Mutations

**Double-check permissions** trong business logic:

```typescript
// src/features/admin/users/server/mutations.ts
export async function createUser(ctx: AuthContext, input: CreateUserInput): Promise<ListedUser> {
  // Check permissions (double-check, API route đã check rồi)
  ensurePermission(ctx, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_MANAGE)

  // Business logic
  // ...
}

function ensurePermission(ctx: AuthContext, ...required: Permission[]) {
  const allowed = required.some((perm) => canPerformAction(ctx.permissions, ctx.roles, perm))
  if (!allowed) {
    throw new ForbiddenError()
  }
}
```

### 3. Super Admin Bypass

**Super admin** có thể bypass permission checks (nếu `allowSuperAdmin: true`):

```typescript
// Super admin có thể access tất cả routes
// Kiểm tra trong api-route-wrapper.ts:
const isAuthorized = allowSuperAdmin
  ? canPerformAnyAction(permissionsList, roles, requiredPermissions) // Super admin bypass
  : requiredPermissions.some((perm) => permissionsList.includes(perm))
```

## ⚠️ Error Handling

### 1. Error Classes

**Sử dụng custom error classes** cho proper error handling:

```typescript
// src/features/admin/users/server/mutations.ts
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
```

### 2. Error Handling trong API Routes

**Handle errors properly** và return appropriate status codes:

```typescript
async function postUsersHandler(req: NextRequest, context: ApiRouteContext) {
  try {
    const user = await createUser(ctx, body as CreateUserInput)
    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    // Handle specific error types
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    
    // Log unexpected errors
    console.error("Error creating user:", error)
    
    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === "production"
    return NextResponse.json(
      { error: isProduction ? "Đã xảy ra lỗi" : error.message },
      { status: 500 }
    )
  }
}
```

### 3. Error Response Format

**Consistent error response format:**

```typescript
// Success
{ data: { ... } }

// Error
{ error: "Error message" }

// Validation error (with details)
{ error: "Validation failed", invalidFields: ["email", "password"] }
```

## 📝 Best Practices cho Triển khai Model Mới

### Checklist khi tạo API routes mới:

#### 1. **Tạo Route Configuration**

```typescript
// src/lib/permissions/route-config.ts
...generateResourceRoutes({
  name: "posts", // Resource name
  permissions: {
    view: PERMISSIONS.POSTS_VIEW,
    create: PERMISSIONS.POSTS_CREATE,
    update: PERMISSIONS.POSTS_UPDATE,
    delete: PERMISSIONS.POSTS_DELETE,
    manage: PERMISSIONS.POSTS_MANAGE,
  },
  customApi: [
    // Custom API routes nếu cần
    { path: "/publish", method: "POST", permissions: [PERMISSIONS.POSTS_PUBLISH] },
  ],
  adminApi: [
    // Admin API routes
    { path: "", method: "GET", permissions: [PERMISSIONS.POSTS_VIEW] },
    { path: "", method: "POST", permissions: [PERMISSIONS.POSTS_CREATE] },
    // ...
  ],
})
```

#### 2. **Tạo API Route với Wrapper**

```typescript
// src/app/api/admin/posts/route.ts
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import { validatePagination, sanitizeSearchQuery } from "@/lib/api/validation"
import { createPost, type AuthContext } from "@/features/admin/posts/server/mutations"

async function getPostsHandler(req: NextRequest, context: ApiRouteContext) {
  // 1. Validate query parameters
  const paginationValidation = validatePagination({
    page: req.nextUrl.searchParams.get("page"),
    limit: req.nextUrl.searchParams.get("limit"),
  })
  if (!paginationValidation.valid) {
    return NextResponse.json({ error: paginationValidation.error }, { status: 400 })
  }

  // 2. Sanitize search query
  const searchValidation = sanitizeSearchQuery(req.nextUrl.searchParams.get("search") || "", 200)
  if (!searchValidation.valid) {
    return NextResponse.json({ error: searchValidation.error }, { status: 400 })
  }

  // 3. Fetch data
  const result = await listPostsCached(
    paginationValidation.page!,
    paginationValidation.limit!,
    searchValidation.value || ""
  )

  // 4. Return response
  return NextResponse.json(result)
}

async function postPostsHandler(req: NextRequest, context: ApiRouteContext) {
  // 1. Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  // 2. Validate required fields
  if (!body.title || !body.content) {
    return NextResponse.json({ error: "Title và content là bắt buộc" }, { status: 400 })
  }

  // 3. Whitelist allowed fields
  const allowedFields = ["title", "content", "categoryId", "tags", "isPublished"]
  const invalidFields = Object.keys(body).filter((key) => !allowedFields.includes(key))
  if (invalidFields.length > 0) {
    return NextResponse.json(
      { error: `Các trường không hợp lệ: ${invalidFields.join(", ")}` },
      { status: 400 }
    )
  }

  // 4. Build AuthContext
  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  // 5. Call mutation
  try {
    const post = await createPost(ctx, body as CreatePostInput)
    return NextResponse.json({ data: post }, { status: 201 })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    console.error("Error creating post:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 })
  }
}

// Auto-apply: authentication, authorization, rate limiting, security headers
export const GET = createGetRoute(getPostsHandler)
export const POST = createPostRoute(postPostsHandler)
```

#### 3. **Tạo Mutations với Permission Checks**

```typescript
// src/features/admin/posts/server/mutations.ts
import { PERMISSIONS, canPerformAction } from "@/lib/permissions"

export async function createPost(ctx: AuthContext, input: CreatePostInput): Promise<ListedPost> {
  // 1. Check permissions
  ensurePermission(ctx, PERMISSIONS.POSTS_CREATE, PERMISSIONS.POSTS_MANAGE)

  // 2. Validate input
  if (!input.title || !input.content) {
    throw new ApplicationError("Title và content là bắt buộc", 400)
  }

  // 3. Business logic
  const post = await prisma.post.create({
    data: {
      title: input.title,
      content: input.content,
      authorId: ctx.actorId,
      // ...
    },
  })

  // 4. Return sanitized data
  return sanitizePost(post)
}

function ensurePermission(ctx: AuthContext, ...required: Permission[]) {
  const allowed = required.some((perm) => canPerformAction(ctx.permissions, ctx.roles, perm))
  if (!allowed) {
    throw new ForbiddenError()
  }
}
```

#### 4. **Validation Checklist**

- ✅ Validate ID format (UUID/CUID)
- ✅ Validate required fields
- ✅ Validate field types
- ✅ Validate field values (email format, password strength, etc.)
- ✅ Validate array length (nếu có)
- ✅ Validate pagination parameters
- ✅ Sanitize search queries
- ✅ Whitelist allowed fields (prevent mass assignment)
- ✅ Validate business rules (email uniqueness, etc.)

#### 5. **Security Checklist**

- ✅ Sử dụng API route wrapper (`createGetRoute`, `createPostRoute`, etc.)
- ✅ Auto-detect permissions từ `ROUTE_CONFIG` hoặc specify manually
- ✅ Double-check permissions trong mutations
- ✅ Validate và sanitize tất cả input
- ✅ Whitelist allowed fields
- ✅ Handle errors properly (không expose internal errors)
- ✅ Log security events (unauthorized access, rate limit exceeded, etc.)
- ✅ Return appropriate status codes (400, 401, 403, 404, 429, 500)

## 🔍 Security Monitoring & Logging

### 1. Security Events được Log

```typescript
// Unauthorized access attempts
logger.warn("Unauthorized API access attempt", {
  path: req.nextUrl.pathname,
  method: req.method,
  error: error.message,
})

// Forbidden access attempts
logger.warn("Forbidden API access attempt", {
  path: req.nextUrl.pathname,
  method: req.method,
  userId: session?.user?.id,
  requiredPermissions,
  userPermissions: permissionsList,
})

// Rate limit exceeded
logger.warn("Rate limit exceeded", {
  identifier,
  path: req.nextUrl.pathname,
  method: req.method,
})

// Request timeout
logger.error("Request timeout", {
  path: req.nextUrl.pathname,
  method: req.method,
})
```

### 2. Recommended Monitoring

- Monitor unauthorized access attempts (401)
- Monitor forbidden access attempts (403)
- Monitor rate limit violations (429)
- Monitor request timeouts (408)
- Monitor internal server errors (500)
- Track permission changes
- Track sensitive operations (delete, hard-delete, etc.)

## 🌐 Environment Variables Security

### Các biến NGUY HIỂM không được commit vào git:

1. **DATABASE_URL**
   - Chứa username và password của database
   - Format: `postgresql://user:password@host:port/database`

2. **NEXTAUTH_SECRET**
   - Secret key để sign và verify JWT tokens
   - Nếu bị lộ, attacker có thể tạo fake tokens
   - Phải có ít nhất 32 ký tự

3. **GOOGLE_CLIENT_SECRET**
   - OAuth secret từ Google Cloud Console
   - Nếu bị lộ, attacker có thể giả mạo OAuth flow

4. **Các API Keys và Tokens khác**
   - Tất cả API keys, access tokens, service account keys

### Checklist Bảo mật:

- ✅ `docs/env.md` chỉ chứa placeholders, không có giá trị thực
- ✅ File `.env.local` được ignore trong `.gitignore`
- ✅ Không commit bất kỳ file `.env*` nào có chứa secrets
- ✅ Sử dụng secrets khác nhau cho mỗi environment (dev/staging/prod)
- ✅ Rotate secrets định kỳ (khuyến nghị 3-6 tháng một lần)

## 🚨 Incident Response

Nếu phát hiện security issue:

1. **Ngay lập tức**:
   - Rotate secrets bị lộ
   - Kiểm tra logs cho suspicious activities
   - Revoke tokens/keys nếu có thể
   - Block suspicious IPs nếu cần

2. **Báo cáo**:
   - Thông báo team lead
   - Document incident
   - Review và cải thiện process

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
