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
        // Extract error message từ axios response nếu có
        let errorMessage = "Unknown error"
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (typeof error === "object" && error !== null && "response" in error) {
          // Axios error response
          const axiosError = error as { response?: { status?: number; data?: { error?: string; message?: string } } }
          if (axiosError.response?.data?.error) {
            errorMessage = axiosError.response.data.error
          } else if (axiosError.response?.data?.message) {
            errorMessage = axiosError.response.data.message
          } else if (axiosError.response?.status) {
            errorMessage = `Request failed with status code ${axiosError.response.status}`
          }
        } else {
          errorMessage = String(error)
        }
        
        logger.error("Failed to create login session via hook", {
          userId,
          error: errorMessage,
        })
      } finally {
        isCreatingRef.current = false
      }
    }

    createSession()
  }, [session?.user?.id, status])
}

