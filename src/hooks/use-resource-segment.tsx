"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DEFAULT_RESOURCE_SEGMENT, applyResourceSegmentToPath } from "@/lib/permissions"
import { logger } from "@/lib/config/logger"

const ResourceSegmentContext = React.createContext<string>(DEFAULT_RESOURCE_SEGMENT)

export interface ResourceSegmentProviderProps {
  value: string
  children: React.ReactNode
}

export function ResourceSegmentProvider({ value, children }: ResourceSegmentProviderProps) {
  return (
    <ResourceSegmentContext.Provider value={value}>
      {children}
    </ResourceSegmentContext.Provider>
  )
}

export function useResourceSegment(): string {
  return React.useContext(ResourceSegmentContext)
}

export function useResourcePath(path: string): string {
  const segment = useResourceSegment()
  return applyResourceSegmentToPath(path, segment)
}

type RouterUrl = string

export function useResourceRouter() {
  const router = useRouter()
  const segment = useResourceSegment()

  return React.useMemo(() => {
    return {
      ...router,
      push: (url: RouterUrl, options?: Parameters<typeof router.push>[1]) => {
        const resolvedUrl = applyResourceSegmentToPath(url, segment)
        const startTime = performance.now()
        
        // Detect navigation type
        const isDetailPage = /\/\[id\]$/.test(url) || /\/([^\/]+)$/.test(url) && !url.includes("/new") && !url.includes("/edit")
        const isEditPage = url.includes("/edit")
        const isNewPage = url.includes("/new")
        const isListPage = !isDetailPage && !isEditPage && !isNewPage
        
        let navType = "unknown"
        if (isNewPage) navType = "new-page"
        else if (isEditPage) navType = "edit-page"
        else if (isDetailPage) navType = "detail-page"
        else if (isListPage) navType = "list-page"
        
        logger.info("➡️ Router.push", {
          source: "useResourceRouter",
          navType,
          originalUrl: url,
          resolvedUrl,
          resourceSegment: segment,
          currentPath: typeof window !== "undefined" ? window.location.pathname : undefined,
        })
        
        const result = router.push(resolvedUrl, options)
        
        // Log completion after a short delay
        setTimeout(() => {
          const duration = performance.now() - startTime
          logger.success("✅ Navigation completed", {
            navType,
            duration: `${duration.toFixed(2)}ms`,
            targetUrl: resolvedUrl,
          })
        }, 100)
        
        return result
      },
      replace: (url: RouterUrl, options?: Parameters<typeof router.replace>[1]) => {
        const resolvedUrl = applyResourceSegmentToPath(url, segment)
        const startTime = performance.now()
        
        logger.info("🔄 Router.replace", {
          source: "useResourceRouter",
          originalUrl: url,
          resolvedUrl,
          resourceSegment: segment,
          currentPath: typeof window !== "undefined" ? window.location.pathname : undefined,
        })
        
        const result = router.replace(resolvedUrl, options)
        
        setTimeout(() => {
          const duration = performance.now() - startTime
          logger.success("✅ Replace completed", {
            duration: `${duration.toFixed(2)}ms`,
            targetUrl: resolvedUrl,
          })
        }, 100)
        
        return result
      },
    }
  }, [router, segment])
}

