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
    try {
      // Transform data if needed
      let submitData: Record<string, unknown>
      try {
        submitData = transformData ? transformData(data) : data
      } catch (transformError) {
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
        return {
          success: false,
          error: "API route is required",
        }
      }

      // Make API call
      const response = await apiClient.request({
        method,
        url: resolvedApiRoute,
        data: submitData,
      })

      // Check success status
      const isSuccess = response.status === 201 || response.status === 200

      if (isSuccess) {
        // Show success toast
        toast({
          variant: "success",
          title: messages.successTitle,
          description: messages.successDescription,
        })

        // Call custom success handler
        if (onSuccess) {
          await onSuccess(response)
        }

        // Handle navigation
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
            router.push(detailPath)
          } else if (navigation.fallback) {
            router.push(navigation.fallback)
          }
        } else if (navigation?.fallback) {
          router.push(navigation.fallback)
        }

        return { success: true }
      }

      // Handle failure
      toast({
        variant: "destructive",
        title: messages.errorTitle,
        description: messages.errorDescription || "Không thể thực hiện thao tác. Vui lòng thử lại.",
      })

      return { success: false, error: messages.errorDescription || "Không thể thực hiện thao tác" }
    } catch (error: unknown) {
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
