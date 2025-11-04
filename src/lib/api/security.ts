/**
 * API Security Utilities
 * Bảo vệ API routes khỏi DDoS, injection attacks, và các cuộc tấn công khác
 */

import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/config"

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory rate limit store (for production, use Redis or database)
const rateLimitStore: RateLimitStore = {}

// Default rate limits per endpoint type
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 requests per minute
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
  write: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
  read: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
}

// Maximum request body size (5MB)
const MAX_BODY_SIZE = 5 * 1024 * 1024

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30000

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Use IP address or user ID if authenticated
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0].trim() || realIP || "unknown"
  
  // If user is authenticated, use user ID for more accurate rate limiting
  // This would require parsing session, but for now use IP
  return `ip:${ip}`
}

/**
 * Check rate limit
 */
function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore[identifier]

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    rateLimitStore[identifier] = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    }
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Clean up expired rate limit records (run periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now()
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key]
    }
  })
}

// Cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}

/**
 * Get rate limit config based on route path
 */
function getRateLimitConfig(pathname: string, method: string): RateLimitConfig {
  // Auth routes - stricter limits
  if (pathname.includes("/auth/") || pathname.includes("/signup") || pathname.includes("/sign-in")) {
    return RATE_LIMITS.auth
  }

  // Write operations - moderate limits
  if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
    return RATE_LIMITS.write
  }

  // Read operations - higher limits
  if (method === "GET") {
    return RATE_LIMITS.read
  }

  return RATE_LIMITS.default
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent XSS attacks
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")

  // Prevent clickjacking
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Content Security Policy (adjust based on your needs)
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  )

  // HSTS (if using HTTPS)
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  }

  return response
}

/**
 * Validate request body size
 */
function validateBodySize(request: NextRequest): { valid: boolean; error?: string } {
  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > MAX_BODY_SIZE) {
      return {
        valid: false,
        error: `Request body too large. Maximum size: ${MAX_BODY_SIZE / 1024 / 1024}MB`,
      }
    }
  }
  return { valid: true }
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
  options?: {
    config?: RateLimitConfig
    endpointType?: "auth" | "write" | "read" | "default"
  }
) {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    try {
      const config =
        options?.config ||
        getRateLimitConfig(req.nextUrl.pathname, req.method)

      const identifier = getClientIdentifier(req)
      const rateLimitResult = checkRateLimit(identifier, config)

      if (!rateLimitResult.allowed) {
        logger.warn("Rate limit exceeded", {
          identifier,
          path: req.nextUrl.pathname,
          method: req.method,
        })

        const response = NextResponse.json(
          {
            error: "Too many requests",
            message: "Vượt quá giới hạn số lượng request. Vui lòng thử lại sau.",
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
          },
          { status: 429 }
        )

        response.headers.set("X-RateLimit-Limit", String(config.maxRequests))
        response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining))
        response.headers.set("X-RateLimit-Reset", String(rateLimitResult.resetTime))
        response.headers.set("Retry-After", String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)))

        return addSecurityHeaders(response)
      }

      // Check body size
      const bodySizeCheck = validateBodySize(req)
      if (!bodySizeCheck.valid) {
        return addSecurityHeaders(
          NextResponse.json({ error: bodySizeCheck.error }, { status: 413 })
        )
      }

      // Execute handler with timeout
      const handlerPromise = handler(req, ...args)
      const timeoutPromise = new Promise<NextResponse>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Request timeout"))
        }, REQUEST_TIMEOUT)
      })

      const response = await Promise.race([handlerPromise, timeoutPromise])

      // Add rate limit headers
      response.headers.set("X-RateLimit-Limit", String(config.maxRequests))
      response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining))
      response.headers.set("X-RateLimit-Reset", String(rateLimitResult.resetTime))

      return addSecurityHeaders(response)
    } catch (error) {
      if (error instanceof Error && error.message === "Request timeout") {
        logger.error("Request timeout", {
          path: req.nextUrl.pathname,
          method: req.method,
        })
        return addSecurityHeaders(
          NextResponse.json(
            { error: "Request timeout", message: "Request đã vượt quá thời gian chờ." },
            { status: 408 }
          )
        )
      }

      logger.error("Security middleware error", error instanceof Error ? error : new Error(String(error)))
      return addSecurityHeaders(
        NextResponse.json({ error: "Internal server error" }, { status: 500 })
      )
    }
  }
}

/**
 * Security wrapper for API routes
 * Combines rate limiting, security headers, and validation
 */
export function withSecurity(
  handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
  options?: {
    rateLimit?: RateLimitConfig
    endpointType?: "auth" | "write" | "read" | "default"
    requireAuth?: boolean
  }
) {
  return withRateLimit(handler, options)
}

