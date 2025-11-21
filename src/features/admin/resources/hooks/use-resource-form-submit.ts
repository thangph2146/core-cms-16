/**
 * Shared Hook for Resource Form Submission
 * 
 * Hook để handle form submission với error handling, toast notifications,
 * và navigation. Giảm duplicate code trong các create/edit client components.
 */

import { useResourceRouter } from "@/hooks/use-resource-segment"
import { useToast } from "@/hooks/use-toast"
import { extractAxiosErrorMessage } from "@/lib/utils/api-utils"
import { apiClient } from "@/lib/api/axios"
import { stripApiBase } from "@/lib/config/api-paths"
import { logger } from "@/lib/config"
import type { AxiosResponse } from "axios"

export interface UseResourceFormSubmitOptions {
  /**
   * API route for create/update
   * For update, can be a function that takes resource ID
   */
  apiRoute: string | ((resourceId: string) => string)
  
  /**
   * HTTP method (POST for create, PUT/PATCH for update)
   */
  method?: "POST" | "PUT" | "PATCH"
  
  /**
   * Resource ID for update operations
   */
  resourceId?: string
  
  /**
   * Success messages
   */
  messages: {
    successTitle: string
    successDescription: string
    errorTitle: string
    errorDescription?: string
  }
  
  /**
   * Navigation options
   */
  navigation?: {
    /**
     * Navigate to detail page after success
     * If true, will navigate to /admin/{resource}/{id}
     * If string, will navigate to that path
     * If function, will call with response data
     */
    toDetail?: boolean | string | ((response: AxiosResponse) => string | undefined)
    /**
     * Fallback navigation path (default: backUrl or list page)
     */
    fallback?: string
  }
  
  /**
   * Transform data before sending
   */
  transformData?: (data: Record<string, unknown>) => Record<string, unknown>
  
  /**
   * Custom success handler
   */
  onSuccess?: (response: AxiosResponse) => void | Promise<void>
}

export interface UseResourceFormSubmitResult {
  /**
   * Submit handler function
   */
  handleSubmit: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
}

/**
 * Hook for handling resource form submission
 * 
 * @example
 * ```typescript
 * const { handleSubmit } = useResourceFormSubmit({
 *   apiRoute: apiRoutes.users.create,
 *   method: "POST",
 *   messages: {
 *     successTitle: "Tạo người dùng thành công",
 *     successDescription: "Người dùng mới đã được tạo thành công.",
 *     errorTitle: "Lỗi tạo người dùng",
 *   },
 *   navigation: {
 *     toDetail: true, // Navigate to detail page
 *   },
 * })
 * ```
 */
export function useResourceFormSubmit({
  apiRoute,
  method = "POST",
  resourceId,
  messages,
  navigation,
  transformData,
  onSuccess,
}: UseResourceFormSubmitOptions): UseResourceFormSubmitResult {
  const router = useResourceRouter()
  const { toast } = useToast()

  const handleSubmit = async (data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> => {
    logger.debug("[useResourceFormSubmit] handleSubmit START", { 
      method,
      resourceId,
      hasTransformData: !!transformData,
      dataKeys: Object.keys(data),
    })
    
    try {
      // Transform data if needed
      let submitData: Record<string, unknown>
      try {
        submitData = transformData ? transformData(data) : data
        logger.debug("[useResourceFormSubmit] Data transformed", { 
          originalKeys: Object.keys(data),
          transformedKeys: Object.keys(submitData),
        })
      } catch (transformError) {
        logger.error("[useResourceFormSubmit] Transform data error", transformError as Error)
        // Handle validation errors from transformData
        const errorMessage = transformError instanceof Error ? transformError.message : "Lỗi xử lý dữ liệu"
        toast({
          variant: "destructive",
          title: messages.errorTitle,
          description: errorMessage,
        })
        return { success: false, error: errorMessage }
      }

      // Resolve API route (support function for dynamic routes)
      if (typeof apiRoute === "function") {
        if (!resourceId) {
          return {
            success: false,
            error: "Resource ID is required for update operations",
          }
        }
      }

      const resolvedApiRoute = typeof apiRoute === "function" && resourceId
        ? apiRoute(resourceId)
        : typeof apiRoute === "string"
          ? apiRoute
          : ""

      if (!resolvedApiRoute) {
        logger.error("[useResourceFormSubmit] API route is required")
        return {
          success: false,
          error: "API route is required",
        }
      }

      logger.debug("[useResourceFormSubmit] Making API call", { 
        method,
        url: resolvedApiRoute,
        resourceId,
        dataKeys: Object.keys(submitData),
      })

      // Make API call
      const response = await apiClient.request({
        method,
        url: resolvedApiRoute,
        data: submitData,
      })

      logger.debug("[useResourceFormSubmit] API call completed", { 
        status: response.status,
        hasData: !!response.data,
        responseData: response.data,
        // Log chi tiết response data để verify
        responseDetails: response.data?.data ? {
          id: response.data.data.id,
          // Log các fields quan trọng từ response
          ...(typeof response.data.data === 'object' ? Object.keys(response.data.data).slice(0, 10).reduce((acc, key) => {
            acc[key] = (response.data.data as Record<string, unknown>)[key]
            return acc
          }, {} as Record<string, unknown>) : {}),
        } : undefined,
      })

      // Check success status
      const isSuccess = response.status === 201 || response.status === 200

      if (isSuccess) {
        logger.debug("[useResourceFormSubmit] Request successful", { 
          status: response.status,
          hasOnSuccess: !!onSuccess,
        })

        // Show success toast
        toast({
          variant: "success",
          title: messages.successTitle,
          description: messages.successDescription,
        })

        // Call custom success handler TRƯỚC navigation để invalidate cache
        // Điều này đảm bảo server cache và React Query cache được invalidate
        // trước khi navigate đến detail page
        if (onSuccess) {
          logger.debug("[useResourceFormSubmit] Calling onSuccess handler")
          await onSuccess(response)
          logger.debug("[useResourceFormSubmit] onSuccess handler completed")
        }

        // Đợi một chút để đảm bảo server cache được invalidate hoàn toàn
        // Next.js cache invalidation có thể mất một chút thời gian
        logger.debug("[useResourceFormSubmit] Waiting for cache invalidation")
        await new Promise((resolve) => setTimeout(resolve, 200))

        // Handle navigation sau khi invalidate cache
        logger.debug("[useResourceFormSubmit] Handling navigation", { 
          hasToDetail: !!navigation?.toDetail,
          hasFallback: !!navigation?.fallback,
        })
        
        if (navigation?.toDetail) {
          let detailPath: string | undefined

          if (typeof navigation.toDetail === "function") {
            detailPath = navigation.toDetail(response)
          } else if (typeof navigation.toDetail === "string") {
            detailPath = navigation.toDetail
          } else if (response.data?.data?.id) {
            // Auto-generate detail path from API route
            if (typeof apiRoute === "string") {
              const normalizedRoute = stripApiBase(apiRoute)
              const resourcePath = normalizedRoute
                .replace(/\/create$/, "")
                .replace(/\/update\([^)]+\)/, "")
                .replace(/\/\d+$/, "")
              detailPath = `${resourcePath}/${response.data.data.id}`
            }
          }

          if (detailPath) {
            logger.debug("[useResourceFormSubmit] Navigating to detail", { detailPath })
            // Navigate với cache-busting parameter để force Server Component refetch
            const url = new URL(detailPath, window.location.origin)
            url.searchParams.set("_t", Date.now().toString())
            router.replace(url.pathname + url.search)
            // Refresh router sau khi navigate để đảm bảo Server Components được re-render
            // Đợi một chút để navigation hoàn tất trước khi refresh
            await new Promise((resolve) => setTimeout(resolve, 150))
            router.refresh()
            logger.debug("[useResourceFormSubmit] Navigation completed")
          } else if (navigation.fallback) {
            const url = new URL(navigation.fallback, window.location.origin)
            url.searchParams.set("_t", Date.now().toString())
            router.replace(url.pathname + url.search)
            await new Promise((resolve) => setTimeout(resolve, 150))
            router.refresh()
          }
        } else if (navigation?.fallback) {
          const url = new URL(navigation.fallback, window.location.origin)
          url.searchParams.set("_t", Date.now().toString())
          router.replace(url.pathname + url.search)
          await new Promise((resolve) => setTimeout(resolve, 150))
          router.refresh()
        }

        logger.debug("[useResourceFormSubmit] handleSubmit SUCCESS")
        return { success: true }
      }

      // Handle failure
      logger.warn("[useResourceFormSubmit] Request failed", { status: response.status })
      toast({
        variant: "destructive",
        title: messages.errorTitle,
        description: messages.errorDescription || "Không thể thực hiện thao tác. Vui lòng thử lại.",
      })

      return { success: false, error: messages.errorDescription || "Không thể thực hiện thao tác" }
    } catch (error: unknown) {
      logger.error("[useResourceFormSubmit] handleSubmit ERROR", error as Error)
      const errorMessage = extractAxiosErrorMessage(error, messages.errorDescription || "Đã xảy ra lỗi")

      toast({
        variant: "destructive",
        title: messages.errorTitle,
        description: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

  return { handleSubmit }
}
