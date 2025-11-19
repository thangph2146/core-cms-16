/**
 * NextAuth.js route handlers for Next.js 16
 */
import { handlers } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/config"

// Wrap handlers để đảm bảo luôn trả về JSON response hợp lệ
async function handleRequest(
  handler: (req: NextRequest) => Promise<Response>,
  req: NextRequest
): Promise<Response> {
  try {
    const response = await handler(req)
    
    // Kiểm tra nếu là redirect response (3xx status) - giữ nguyên
    if (response.status >= 300 && response.status < 400) {
      return response
    }
    
    const contentType = response.headers.get("content-type")
    const isJson = contentType?.includes("application/json")
    
    // Nếu là JSON response, kiểm tra body có rỗng không
    if (isJson) {
      try {
        // Clone response để đọc body mà không consume original response
        const clonedResponse = response.clone()
        const bodyText = await clonedResponse.text()
        const isEmpty = bodyText.trim().length === 0
        
        // Nếu JSON response rỗng, trả về JSON hợp lệ
        if (isEmpty) {
          logger.warn("NextAuth returned empty JSON response", {
            status: response.status,
          })
          
          return NextResponse.json(
            response.status >= 400
              ? { error: "InternalServerError", message: "Authentication service error" }
              : { ok: true },
            { status: response.status || 200 }
          )
        }
        
        // Nếu JSON không rỗng, trả về response gốc (body vẫn còn nguyên)
        return response
      } catch (error) {
        // Nếu không đọc được body, log và trả về JSON error nếu là error status
        logger.warn("Failed to read response body", {
          error: error instanceof Error ? error.message : String(error),
          status: response.status,
        })
        
        if (response.status >= 400) {
          return NextResponse.json(
            {
              error: "InternalServerError",
              message: "Authentication service error",
            },
            { status: response.status || 500 }
          )
        }
        
        // Nếu không phải error, trả về response gốc
        return response
      }
    }
    
    // Nếu không phải JSON response
    if (response.status >= 400) {
      // Error response không phải JSON - chuyển đổi thành JSON
      logger.error("NextAuth returned non-JSON error response", {
        status: response.status,
        contentType,
      })
      
      return NextResponse.json(
        {
          error: "InternalServerError",
          message: "Authentication service error",
        },
        { status: response.status || 500 }
      )
    }
    
    // Success response không phải JSON - trả về nguyên bản (có thể là redirect, HTML, etc.)
    return response
  } catch (error) {
    logger.error("Error in NextAuth handler", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    return NextResponse.json(
      {
        error: "InternalServerError",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(handlers.GET, req)
}

export async function POST(req: NextRequest) {
  return handleRequest(handlers.POST, req)
}
