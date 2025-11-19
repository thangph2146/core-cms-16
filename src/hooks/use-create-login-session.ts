"use client"

/**
 * Hook để tự động tạo Session record sau khi đăng nhập thành công
 * Sử dụng trong SessionProvider hoặc layout để tự động tạo session khi user đăng nhập
 * 
 * Logic:
 * - Chỉ tạo session một lần cho mỗi user session (track bằng userId + session token)
 * - Tự động tạo cho cả credentials và OAuth (Google) login
 * - Không block app nếu có lỗi
 */

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { logger } from "@/lib/config"

// Global set để track sessions đã tạo (persist across component remounts)
const createdSessions = new Set<string>()

/**
 * Hook để tự động tạo Session record sau khi đăng nhập thành công
 * Chỉ tạo một lần khi user đăng nhập (track bằng userId)
 */
export function useCreateLoginSession() {
  const { data: session, status } = useSession()
  const isCreatingRef = useRef(false)

  useEffect(() => {
    // Chỉ chạy khi đã authenticated và có userId
    if (status !== "authenticated" || !session?.user?.id) {
      return
    }

    const userId = session.user.id
    const sessionKey = `session_${userId}`

    // Kiểm tra xem đã tạo session cho user này chưa
    if (createdSessions.has(sessionKey) || isCreatingRef.current) {
      return
    }

    // Tạo session record
    const createSession = async () => {
      // Đánh dấu đang tạo để tránh duplicate calls
      isCreatingRef.current = true

      try {
        logger.debug("Creating login session via hook", { userId })
        
        await apiClient.post(apiRoutes.auth.createSession, {})
        
        // Đánh dấu đã tạo session cho user này
        createdSessions.add(sessionKey)
        
        logger.debug("Login session created successfully via hook", { userId })
      } catch (error) {
        // Log error nhưng không block app
        logger.error("Failed to create login session via hook", {
          userId,
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        isCreatingRef.current = false
      }
    }

    createSession()
  }, [session?.user?.id, status])
}

