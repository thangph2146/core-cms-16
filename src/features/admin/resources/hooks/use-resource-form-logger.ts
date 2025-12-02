import { useEffect, useRef } from "react"
import { resourceLogger } from "@/lib/config/resource-logger"
import type { ResourceAction } from "@/lib/config/resource-logger"

const FORM_LOG_DEBOUNCE_MS = 500

interface UseResourceFormLoggerOptions<T extends Record<string, unknown>> {
  resourceName: string
  resourceId?: string
  action: "create" | "update"
  formData: T | null | undefined
  isSubmitting?: boolean
  submitSuccess?: boolean
  submitError?: string | null
}

export function useResourceFormLogger<T extends Record<string, unknown>>({
  resourceName,
  resourceId,
  action,
  formData,
  isSubmitting = false,
  submitSuccess = false,
  submitError = null,
}: UseResourceFormLoggerOptions<T>) {
  const loggedFormDataKeyRef = useRef<string | null>(null)
  const loggedSubmitRef = useRef<boolean>(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Log form structure khi form data thay đổi (với debounce để tránh log quá nhiều khi user type)
  useEffect(() => {
    if (!formData || isSubmitting) {
      // Clear timeout nếu đang submitting
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }
      return
    }

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Tạo unique key từ form data - sort keys để đảm bảo consistent
      // Loại bỏ các field không quan trọng cho comparison (như content editor state)
      const normalizedData = Object.keys(formData)
        .sort()
        .reduce((acc, key) => {
          const value = formData[key]
          if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
            acc[key] = value
          } else {
            // Với object phức tạp, chỉ lưu type để tránh duplicate do thứ tự properties
            acc[key] = `[object:${typeof value}]`
          }
          return acc
        }, {} as Record<string, unknown>)
      
      const formDataKey = JSON.stringify(normalizedData)

      // Nếu đã log cho form data này rồi, skip
      if (loggedFormDataKeyRef.current === formDataKey) return

      // Mark as logged
      loggedFormDataKeyRef.current = formDataKey

      // Log form structure
      resourceLogger.dataStructure({
        resource: resourceName,
        dataType: "form",
        structure: {
          fields: formData as Record<string, unknown>,
          action,
        },
      })
    }, FORM_LOG_DEBOUNCE_MS)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }
    }
  }, [resourceName, action, formData, isSubmitting])

  // Log submit action
  useEffect(() => {
    const actionType: ResourceAction = action === "create" ? "create" : "update"

    // Log success
    if (!isSubmitting && submitSuccess && !loggedSubmitRef.current) {
      loggedSubmitRef.current = true

      if (resourceId) {
        resourceLogger.detailAction({
          resource: resourceName,
          action: actionType,
          resourceId,
          recordData: formData as Record<string, unknown> | undefined,
        })
      }

      resourceLogger.actionFlow({
        resource: resourceName,
        action: actionType,
        step: "success",
        metadata: { resourceId: resourceId || undefined },
      })
    }

    // Log error
    if (submitError && !loggedSubmitRef.current) {
      loggedSubmitRef.current = true
      resourceLogger.actionFlow({
        resource: resourceName,
        action: actionType,
        step: "error",
        metadata: { resourceId: resourceId || undefined, error: submitError },
      })
    }

    // Reset khi bắt đầu submit mới
    if (isSubmitting) {
      loggedSubmitRef.current = false
    }
  }, [resourceName, resourceId, action, isSubmitting, submitSuccess, submitError, formData])
}

