/**
 * Next.js 16 Proxy - Xử lý authentication và proxy requests
 * Đã đổi tên từ middleware.ts theo Next.js 16 documentation
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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

export function proxy(request: NextRequest) {
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

  // 6. Authentication Check
  const isAuthPage = pathname.startsWith("/auth")
  const isAdminPage = pathname.startsWith("/admin")

  // Get session token from cookies
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value

  // Nếu chưa đăng nhập và truy cập admin, redirect về sign-in
  if (!sessionToken && isAdminPage) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url))
  }

  // Nếu đã đăng nhập và truy cập auth pages, redirect về dashboard
  if (sessionToken && isAuthPage && !isApiAuth) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url))
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

export const config = {
  matcher: [
    "/admin/:path*",
    "/auth/:path*",
    "/api/proxy/:path*", // Chỉ match proxy routes, không match /api/auth
    "/maintenance",
  ],
}
