/**
 * Next.js 16 Proxy
 * 
 * Tài liệu chính thức:
 * - https://nextjs.org/docs/app/getting-started/proxy
 * - https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 * - https://nextjs.org/docs/app/guides/upgrading/codemods#middleware-to-proxy
 * 
 * RUNTIME: Edge Runtime (mặc định)
 * 
 * Theo tài liệu Next.js 16 chính thức:
 * - Proxy mặc định chạy ở Edge Runtime
 * - Edge Runtime = Vercel Edge Network, Cloudflare Workers, hoặc edge servers
 * - Chạy ở network boundary, gần client hơn (lower latency)
 * - Chạy trước khi request được hoàn thành (before request is completed)
 * - Từ Next.js 15.5.0+ có thể config runtime: 'nodejs' (NHƯNG không được khuyến nghị)
 * - Edge Runtime được khuyến nghị cho redirects, rewrites, và request modifications
 * 
 * Use cases của Proxy (theo Next.js docs):
 * - Quick redirects after reading parts of the incoming request
 * - Rewriting to different pages based on A/B tests or experiments
 * - Modifying headers for all pages or a subset of pages
 * - KHÔNG nên dùng cho slow data fetching
 * - KHÔNG nên dùng như full session management solution
 * 
 * Hạn chế của Edge Runtime:
 * - Không có access đến Node.js APIs (fs, crypto, child_process, etc.)
 * - Không thể dùng Node.js-only packages (bcrypt, prisma client, database drivers, etc.)
 * - Chỉ có thể dùng Web APIs (fetch, URL, Headers, etc.) và Edge-compatible packages
 * - Không thể validate JWT token trực tiếp (cần Node.js runtime)
 * - Using fetch with cache options has no effect in Proxy
 * 
 * Migration từ Middleware (Next.js 16):
 * - Next.js 16 đã đổi tên "middleware" thành "proxy"
 * - Codemod: npx @next/codemod@canary middleware-to-proxy .
 * - File convention: proxy.ts hoặc src/proxy.ts (ở root hoặc src, cùng level với pages/app)
 * - Function name: export function proxy() (không phải middleware())
 * - Chỉ được phép 1 file proxy.ts per project (nhưng có thể organize logic vào modules)
 * - Lý do: Tránh nhầm lẫn với Express.js middleware, làm rõ mục đích là network proxy
 * 
 * Theo Next.js 16 best practices:
 * - Proxy chạy ở Edge Runtime, xử lý redirects sớm trong request pipeline
 * - Proxy làm "optimistic checks": decrypt session từ cookie (không làm database checks)
 * - NextAuth v5 có thể decrypt session cookie trong Edge Runtime
 * - Proxy chỉ decrypt JWT từ cookie để redirect sớm, tránh render không cần thiết
 * - Security checks chính (database validation) được làm ở DAL (Data Access Layer)
 * - Layouts không làm auth checks và redirects (vì Partial Rendering)
 * - PermissionRouter ở client-side xử lý permission checks chi tiết
 * 
 * Chức năng:
 * - CORS validation
 * - Maintenance mode check
 * - IP whitelist cho admin routes
 * - Authentication redirects (optimistic checks: decrypt session từ cookie)
 * - Proxy API requests
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"

/**
 * Theo Next.js 16 docs về Proxy và session handling:
 * - Proxy chạy trên Edge Runtime (mặc định) hoặc Node.js runtime (từ Next.js 15.5.0+)
 * - Trong Edge Runtime, có thể dùng `request.cookies.get()` để đọc cookies
 * - Với NextAuth v5, `auth()` function có thể decrypt session cookie trong Edge Runtime
 * - Pattern: Decrypt session từ cookie để làm optimistic checks (không query database)
 */

// Environment variables
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
]
const ALLOWED_IPS = process.env.ALLOWED_IPS?.split(",") || []
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true"
const MAINTENANCE_BYPASS_KEY = process.env.MAINTENANCE_BYPASS_KEY
const EXTERNAL_API_BASE_URL =
  process.env.EXTERNAL_API_BASE_URL || "http://localhost:8000/api"
const AUTH_PREFIX = "/auth"
const SIGN_IN_PATH = "/auth/sign-in"
const ADMIN_PREFIX = "/admin"
const DASHBOARD_PATH = "/admin/dashboard"

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  const cfConnectingIP = request.headers.get("cf-connecting-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  return "unknown"
}

function checkIPWhitelist(ip: string): boolean {
  if (ALLOWED_IPS.length === 0) {
    return true
  }
  return ALLOWED_IPS.includes(ip)
}

function checkMaintenanceMode(request: NextRequest): boolean {
  if (!MAINTENANCE_MODE) {
    return false
  }

  const bypassKey =
    request.headers.get("x-maintenance-bypass") ||
    new URL(request.url).searchParams.get("bypass")

  return bypassKey === MAINTENANCE_BYPASS_KEY
}

function buildRedirectUrl(request: NextRequest, targetPath: string) {
  const url = new URL(request.url)
  url.pathname = targetPath
  url.search = ""
  url.hash = ""
  return url
}

function getSafeCallback(pathname: string, callbackUrl: string | null): string | null {
  if (!callbackUrl) {
    return null
  }

  try {
    const decoded = decodeURIComponent(callbackUrl)
    if (!decoded.startsWith("/")) {
      return null
    }
    if (decoded.startsWith(`${AUTH_PREFIX}/`)) {
      return null
    }
    if (decoded === pathname) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const origin = request.headers.get("origin")

  // 1. CORS Check
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403 }
    )
  }

  // 2. Maintenance Mode Check
  if (MAINTENANCE_MODE && !checkMaintenanceMode(request)) {
    const isApiRoute = pathname.startsWith("/api")
    if (isApiRoute) {
      return NextResponse.json(
        {
          error: "Maintenance mode is enabled",
          message: "The system is currently under maintenance",
        },
        { status: 503 }
      )
    }
    // Redirect to maintenance page
    return NextResponse.redirect(new URL("/maintenance", request.url))
  }

  // 3. IP Whitelist Check for Admin Routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const clientIP = getClientIP(request)
    if (!checkIPWhitelist(clientIP)) {
      return NextResponse.json(
        { error: "IP address not allowed" },
        { status: 403 }
      )
    }
  }

  // 4. Skip proxy for NextAuth routes (must pass through)
  const isApiAuth = pathname.startsWith("/api/auth")
  if (isApiAuth) {
    // NextAuth routes should not be proxied or modified
    return NextResponse.next()
  }

  // 5. Proxy API requests sử dụng rewrite (theo NextJS documentation)
  if (pathname.startsWith("/api/proxy/")) {
    // Extract path sau /api/proxy/
    const proxyPath = pathname.replace("/api/proxy/", "")
    const queryString = request.nextUrl.search

    // Build target URL
    const targetUrl = new URL(`${EXTERNAL_API_BASE_URL}/${proxyPath}${queryString}`)

    // Rewrite request to external API (proxy)
    return NextResponse.rewrite(targetUrl)
  }

  // 6. Authentication Redirects (Optimistic Checks - Edge Runtime)
  // 
  // Theo Next.js 16 docs: https://nextjs.org/docs/app/getting-started/proxy
  // - Proxy nên làm "optimistic checks" - decrypt session từ cookie
  // - Pattern từ docs: Sử dụng `req.cookies.get('session').value` hoặc `auth()` từ NextAuth
  // - Proxy KHÔNG nên làm database checks hoặc full session validation
  // - Proxy chỉ nên làm quick redirects để tránh render không cần thiết
  // - Security checks chính nên ở DAL (Data Access Layer)
  // - Proxy KHÔNG nên dùng như full session management solution
  //
  // Flow xử lý session và redirect (theo Next.js 16 best practices):
  // 1. Proxy (Edge Runtime) -> Optimistic checks: decrypt session từ cookie, quick redirects
  // 2. Layouts (Server Components) -> Fetch session với getSession(), không redirect (Partial Rendering)
  // 3. PermissionRouter (Client Component) -> Permission checks và redirects chi tiết
  // 4. DAL (Data Access Layer) -> Security checks chính khi fetch data (database validation)
  const isAuthPage = pathname.startsWith(AUTH_PREFIX)
  const isAdminPage = pathname.startsWith(ADMIN_PREFIX)

  // Optimistic check: Kiểm tra và decrypt session từ cookie (không làm database checks)
  // 
  // Theo Next.js 16 docs: Proxy nên làm "optimistic checks"
  // - Kiểm tra cookie existence trước (nhanh, không cần decrypt)
  // - Nếu có cookie, decrypt để verify session hợp lệ
  // - KHÔNG làm database checks (không validate user có tồn tại, không check permissions)
  // - Chỉ decrypt JWT từ cookie để redirect sớm
  // - Security checks chính (database validation) được làm ở DAL
  //
  // NextAuth v5 (Auth.js) cookie names (theo thực tế):
  // - Development: `authjs.session-token` (chính, được dùng trong development)
  // - Production (HTTPS): `__Secure-authjs.session-token` (khi dùng HTTPS)
  // - Legacy support: `next-auth.session-token` hoặc `__Secure-next-auth.session-token`
  //
  // Pattern từ Next.js 16 docs: `req.cookies.get('session').value`
  // Pattern tối ưu: Kiểm tra cookie existence trước, sau đó decrypt nếu có
  let hasValidSession = false
  
  // Bước 1: Kiểm tra cookie existence (nhanh, không cần decrypt)
  // Theo tài liệu Next.js 16: Sử dụng `request.cookies.get()` trong Proxy
  // Ưu tiên cookie name chính của NextAuth v5: `authjs.session-token`
  const sessionCookie = 
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value
  
  // Nếu không có cookie, chắc chắn chưa đăng nhập (không cần decrypt)
  // Theo observation: Khi chưa đăng nhập, cookie `authjs.session-token` không tồn tại
  if (!sessionCookie) {
    hasValidSession = false
  } else {
    // Bước 2: Có cookie -> decrypt để verify session hợp lệ
    // NextAuth v5 `auth()` function có thể decrypt session cookie trong Edge Runtime
    // Nó chỉ decrypt JWT token từ cookie (encrypted với AES-256-GCM), không query database
    // Theo observation: Khi đã đăng nhập, cookie `authjs.session-token` chứa encrypted JWT
    try {
      // Decrypt session từ cookie (Edge Runtime compatible)
      // Nếu thành công -> có session cookie hợp lệ -> user đã đăng nhập
      // Nếu thất bại -> session invalid, expired, hoặc corrupted -> user chưa đăng nhập
      const session = await auth()
      hasValidSession = Boolean(session?.user)
    } catch (error) {
      // Nếu decrypt thất bại, coi như không có session hợp lệ
      // Đây là optimistic check, không cần xử lý lỗi chi tiết
      // Security checks thực sự sẽ được làm ở DAL khi fetch data
      // Fallback: Nếu decrypt fail, coi như chưa đăng nhập và redirect về sign-in
      hasValidSession = false
      
      // Log error trong development để debug
      if (process.env.NODE_ENV === "development") {
        console.warn("Proxy: Failed to decrypt session", error)
      }
    }
  }

  const safeCallback = getSafeCallback(
    pathname,
    request.nextUrl.searchParams.get("callbackUrl")
  )

  // Case 1: Chưa đăng nhập (không có session) và truy cập admin routes
  // -> Redirect về sign-in với callbackUrl để redirect lại sau khi đăng nhập
  // Đây là quick redirect dựa trên optimistic check (decrypt session từ cookie)
  // Session validation thực sự sẽ được làm ở layout với auth() (Server Component)
  if (!hasValidSession && isAdminPage) {
    const signInUrl = buildRedirectUrl(request, SIGN_IN_PATH)
    const callbackValue = `${pathname}${request.nextUrl.search}`
    // Chỉ thêm callbackUrl nếu hợp lệ (bắt đầu bằng /)
    if (callbackValue.startsWith("/")) {
      signInUrl.searchParams.set("callbackUrl", encodeURIComponent(callbackValue))
    }
    return NextResponse.redirect(signInUrl)
  }

  // Case 2: Đã đăng nhập (có session) và truy cập auth pages (sign-in, sign-up)
  // -> Redirect về dashboard hoặc callbackUrl hợp lệ
  // Đây là quick redirect để tránh flash content (user thấy form đăng nhập trong 0.5s)
  // PermissionRouter sẽ validate session thực sự ở client-side với useSession()
  if (hasValidSession && isAuthPage && !isApiAuth) {
    // Ưu tiên callbackUrl nếu hợp lệ, fallback về dashboard
    const redirectPath = safeCallback ?? DASHBOARD_PATH
    return NextResponse.redirect(buildRedirectUrl(request, redirectPath))
  }

  // Set CORS headers for API routes
  const response = NextResponse.next()
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    )
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    )
  }

  return response
}

/**
 * Proxy Configuration
 * 
 * Theo tài liệu Next.js 16: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 * 
 * RUNTIME:
 * - Mặc định: Edge Runtime (không cần khai báo)
 * - Có thể config runtime: 'nodejs' (từ Next.js 15.5.0+)
 * - Nhưng Edge Runtime được khuyến nghị vì:
 *   + Chạy gần client hơn (lower latency)
 *   + Tốt hơn cho redirects và request modifications
 *   + Không cần Node.js APIs trong trường hợp này
 * 
 * MATCHER:
 * - Chỉ định các routes mà Proxy sẽ chạy
 * - Hỗ trợ regex patterns và negative lookaheads
 * - Xem thêm: https://nextjs.org/docs/app/api-reference/file-conventions/proxy#matcher
 */
export const config = {
  // Runtime mặc định là 'edge' trong Next.js 16
  // Không cần khai báo runtime: 'edge' vì đây là mặc định
  // Nếu cần Node.js APIs, có thể thêm: runtime: 'nodejs' (từ Next.js 15.5.0+)
  matcher: [
    "/admin/:path*",
    "/auth/:path*",
    "/api/proxy/:path*", // Chỉ match proxy routes, không match /api/auth
    "/maintenance",
  ],
}
