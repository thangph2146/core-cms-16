/**
 * API route để tạo Session record sau khi đăng nhập thành công
 * Client sẽ gọi route này sau khi NextAuth signIn thành công
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createLoginSession } from "@/features/admin/sessions/server/create-login-session"
import { logger } from "@/lib/config"

function getClientIP(request: NextRequest): string | null {
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
  return null
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra user đã đăng nhập chưa
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Lấy userAgent và ipAddress từ request headers
    const userAgent = request.headers.get("user-agent")
    const ipAddress = getClientIP(request)

    // Tạo Session record
    const sessionRecord = await createLoginSession({
      userId: session.user.id,
      userAgent,
      ipAddress,
    })

    logger.debug("Login session created via API", {
      sessionId: sessionRecord.id,
      userId: session.user.id,
    })

    return NextResponse.json(
      { 
        data: sessionRecord,
        message: "Session created successfully" 
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error("Error creating login session via API", error instanceof Error ? error : new Error(String(error)))
    
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    )
  }
}

