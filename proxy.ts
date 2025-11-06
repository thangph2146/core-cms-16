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
 * Chức năng:
 * - CORS validation
 * - Maintenance mode check
 * - IP whitelist cho admin routes
 * - Proxy API requests
 * - Security headers
 * - Static asset caching
 * 
 * Note: Authentication redirects được xử lý bởi PermissionGateClient ở client-side
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logger } from "@/lib/config"

// Environment variables
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
]
const ALLOWED_IPS = process.env.ALLOWED_IPS?.split(",") || []
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true"
const MAINTENANCE_BYPASS_KEY = process.env.MAINTENANCE_BYPASS_KEY
const EXTERNAL_API_BASE_URL =
  process.env.EXTERNAL_API_BASE_URL || "http://localhost:8000/api"


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

  // 6. Security Headers (giống @core-cms)
  const response = NextResponse.next()
  
  // Set pathname header for server components
  response.headers.set("x-pathname", pathname)
  
  // Security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "origin-when-cross-origin")
  response.headers.set("X-DNS-Prefetch-Control", "on")

  // 9. CORS headers for API routes (giống @core-cms)
  if (pathname.startsWith("/api")) {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin)
      response.headers.set("Access-Control-Allow-Credentials", "true")
    } else {
      // Allow all origins for API routes if no specific origin (giống @core-cms)
      response.headers.set("Access-Control-Allow-Origin", "*")
    }
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    )
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    )

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: response.headers })
    }
  }

  // 10. Static Asset Optimization (giống @core-cms)
  if (pathname.startsWith("/_next/static/")) {
    // Cache static assets for 1 year
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    )
  }

  // 11. Development Mode Logging (giống @core-cms)
  logger.debug("Proxy processing request", {
    method: request.method,
    pathname,
    url: request.url,
    userAgent: request.headers.get("user-agent"),
    file: "proxy.ts",
    line: 359,
  })

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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
