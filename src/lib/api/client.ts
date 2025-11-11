/**
 * Lightweight API client helpers
 * Standardize success/error shape for axios requests.
 */

import axios from "axios"
import type { AxiosRequestConfig, AxiosResponse } from "axios"
import { apiClient } from "./axios"
import { apiPathConfig, stripApiBase } from "@/lib/config/api-paths"

export interface ApiResult<T = unknown> {
  ok: boolean
  status: number
  data?: T
  message?: string
  error?: string
  success?: boolean
}

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i

const ensureLeadingSlash = (path: string): string => {
  if (!path) return "/"
  return path.startsWith("/") ? path : `/${path}`
}

const normalizeHeaders = (headers?: HeadersInit): Record<string, string> | undefined => {
  if (!headers) return undefined
  if (headers instanceof Headers) {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }
  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})
  }
  return headers as Record<string, string>
}

const normalizeUrl = (url: string): { url: string; useBase: boolean } => {
  if (!url) {
    return { url: "/", useBase: true }
  }
  if (ABSOLUTE_URL_PATTERN.test(url)) {
    return { url, useBase: false }
  }
  if (url.startsWith(apiPathConfig.basePath)) {
    return { url: stripApiBase(url), useBase: true }
  }
  return { url: ensureLeadingSlash(url), useBase: true }
}

const extractResponsePayload = <T>(response: AxiosResponse<T>): ApiResult<T> => {
  const payload = response.data as unknown
  const asObj = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : null
  const obj = asObj(payload)
  const statusOk = response.status >= 200 && response.status < 300
  const successField = typeof obj?.success === "boolean" ? (obj.success as boolean) : statusOk
  const message = (obj?.message as string) || (successField ? "Thao tác thành công" : undefined)
  const error = (obj?.error as string) || (successField ? undefined : response.statusText || "Đã xảy ra lỗi")

  return {
    ok: statusOk && successField,
    success: successField,
    status: response.status,
    data: ((obj && (obj.data as T)) ?? (payload as T)) as T,
    message,
    error,
  }
}

export async function requestJson<T = unknown>(input: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const { url, useBase } = normalizeUrl(input)
    const method = (init?.method || "GET").toUpperCase()
    const headers = normalizeHeaders(init?.headers)
    const data = init?.body

    const config: AxiosRequestConfig = {
      url,
      method,
      headers,
      data,
    }

    if (!useBase) {
      config.baseURL = undefined
    }

    const response = await apiClient.request<T>(config)
    return extractResponsePayload(response)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0
      const payload = error.response ? extractResponsePayload(error.response) : null
      return (
        payload || {
          ok: false,
          success: false,
          status,
          error: error.message || "Không thể kết nối máy chủ",
        }
      )
    }

    return {
      ok: false,
      success: false,
      status: 0,
      error: error instanceof Error ? error.message : "Không thể kết nối máy chủ",
    }
  }
}

export function toJsonBody(payload?: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  }
}
