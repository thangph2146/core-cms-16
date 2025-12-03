"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { logger } from "@/lib/config/logger"

/**
 * Hook để log khi page load hoàn thành
 * Sử dụng trong client components để track page load performance
 */
export function usePageLoadLogger(pageType?: "detail" | "edit" | "new" | "list" | "unknown") {
  const pathname = usePathname()
  const hasLogged = useRef(false)
  const loadStartTime = useRef<number>(0)

  useEffect(() => {
    // Reset khi pathname thay đổi
    hasLogged.current = false
    loadStartTime.current = performance.now()

    // Log khi component mount (page bắt đầu load)
    if (pathname) {
      logger.debug("📄 Page load started", {
        source: "usePageLoadLogger",
        pathname,
        pageType: pageType || detectPageType(pathname),
      })
    }
  }, [pathname, pageType])

  useEffect(() => {
    // Chỉ log một lần khi page đã render xong
    if (hasLogged.current) return

    // Sử dụng requestAnimationFrame để đảm bảo DOM đã render
    const rafId = requestAnimationFrame(() => {
      // Sử dụng setTimeout để đảm bảo tất cả effects đã chạy xong
      const timeoutId = setTimeout(() => {
        if (!pathname) return
        
        const loadDuration = performance.now() - loadStartTime.current
        const detectedType = pageType || detectPageType(pathname)

        logger.success("✅ Page load completed", {
          source: "usePageLoadLogger",
          pathname,
          pageType: detectedType,
          duration: `${loadDuration.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
        })

        hasLogged.current = true
      }, 100) // Delay 100ms để đảm bảo tất cả async operations đã hoàn thành

      return () => clearTimeout(timeoutId)
    })

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [pathname, pageType])
}

/**
 * Detect page type từ pathname
 */
function detectPageType(pathname: string): "detail" | "edit" | "new" | "list" | "unknown" {
  if (pathname.includes("/new")) return "new"
  if (pathname.includes("/edit")) return "edit"
  if (pathname.match(/\/\[id\]$/) || pathname.match(/\/([^\/]+)$/) && !pathname.includes("/new") && !pathname.includes("/edit")) {
    return "detail"
  }
  // List page thường là resource root hoặc có pattern /admin/resource
  if (pathname.match(/^\/admin\/[^\/]+$/)) return "list"
  return "unknown"
}

