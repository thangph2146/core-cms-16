/**
 * Axios instance configuration với proxy support
 */
import axios from "axios"
import { logger } from "@/lib/logger"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

// Tạo axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor - thêm auth token và xử lý proxy
apiClient.interceptors.request.use(
  (config) => {
    // Lấy token từ cookie hoặc localStorage
    if (typeof window !== "undefined") {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    // Thêm headers cho proxy nếu cần
    if (config.url?.startsWith("/api/proxy")) {
      config.headers["X-Proxy-Request"] = "true"
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - xử lý errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 - Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/auth/sign-in"
      }
    }

    // Handle 403 - Forbidden
    if (error.response?.status === 403) {
      logger.warn("Access denied", {
        url: originalRequest.url,
        status: error.response.status,
      })
    }

    return Promise.reject(error)
  }
)

export default apiClient

