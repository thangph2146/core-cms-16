import type { AdminBreadcrumbItem } from "@/components/layouts/headers/admin-header"
import { applyResourceSegmentToPath, DEFAULT_RESOURCE_SEGMENT } from "@/lib/permissions"
import { logActionFlow } from "./server/mutation-helpers"

export function formatDateVi(date: string | Date): string {
  return new Date(date).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, "")
}

export function validateName(value: unknown): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, error: "Tên là bắt buộc" }
  }
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    return { valid: false, error: "Tên phải có ít nhất 2 ký tự" }
  }
  if (trimmed.length > 100) {
    return { valid: false, error: "Tên không được vượt quá 100 ký tự" }
  }
  return { valid: true }
}

export function validateSlug(value: unknown): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, error: "Slug là bắt buộc" }
  }
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    return { valid: false, error: "Slug phải có ít nhất 2 ký tự" }
  }
  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return { valid: false, error: "Slug chỉ được chứa chữ thường, số và dấu gạch ngang" }
  }
  return { valid: true }
}

export function validateEmail(value: unknown): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, error: "Email là bắt buộc" }
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value.trim())) {
    return { valid: false, error: "Email không hợp lệ" }
  }
  return { valid: true }
}

export function validatePhone(value: unknown): { valid: boolean; error?: string } {
  if (!value || value === "") {
    return { valid: true }
  }
  if (typeof value !== "string") {
    return { valid: false, error: "Số điện thoại không hợp lệ" }
  }
  const phoneRegex = /^[0-9+\-\s()]+$/
  if (!phoneRegex.test(value.trim())) {
    return { valid: false, error: "Số điện thoại chỉ được chứa số, dấu +, -, khoảng trắng và dấu ngoặc" }
  }
  return { valid: true }
}

export function validateDescription(value: unknown): { valid: boolean; error?: string } {
  if (!value || value === "") {
    return { valid: true }
  }
  if (typeof value !== "string") {
    return { valid: false, error: "Mô tả không hợp lệ" }
  }
  if (value.length > 500) {
    return { valid: false, error: "Mô tả không được vượt quá 500 ký tự" }
  }
  return { valid: true }
}

export function normalizeSearch(value: string | undefined | null): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function sanitizeFilters(
  filters?: Record<string, string | null | undefined>,
): Record<string, string> {
  if (!filters) return {}

  return Object.entries(filters).reduce<Record<string, string>>((acc, [key, rawValue]) => {
    if (rawValue === undefined || rawValue === null) {
      return acc
    }

    const value = String(rawValue).trim()
    if (value.length > 0) {
      acc[key] = value
    }

    return acc
  }, {})
}

export function truncateBreadcrumbLabel(text: string, maxLength: number = 30): string {
  if (!text || text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength).trim() + "..."
}

export function getResourceSegmentFromParams(
  resource?: string,
  defaultSegment: string = DEFAULT_RESOURCE_SEGMENT
): string {
  return resource && resource.length > 0 ? resource.toLowerCase() : defaultSegment
}

export interface CreateBreadcrumbsOptions {
  resourceSegment?: string
  listLabel: string
  listPath: string
  detailLabel?: string
  detailPath?: string
  editLabel?: string
  editPath?: string
  createLabel?: string
  createPath?: string
}

export function createListBreadcrumbs({
  resourceSegment: _resourceSegment = DEFAULT_RESOURCE_SEGMENT,
  listLabel,
}: Pick<CreateBreadcrumbsOptions, "resourceSegment" | "listLabel">): AdminBreadcrumbItem[] {
  return [{ label: listLabel, isActive: true }]
}

export function createDetailBreadcrumbs({
  resourceSegment = DEFAULT_RESOURCE_SEGMENT,
  listLabel,
  listPath,
  detailLabel,
  detailPath,
}: Pick<CreateBreadcrumbsOptions, "resourceSegment" | "listLabel" | "listPath" | "detailLabel" | "detailPath">): AdminBreadcrumbItem[] {
  if (!detailLabel || !detailPath) {
    return createListBreadcrumbs({ resourceSegment, listLabel })
  }
  
  return [
    { label: listLabel, href: applyResourceSegmentToPath(listPath, resourceSegment) },
    { label: truncateBreadcrumbLabel(detailLabel), isActive: true },
  ]
}

export function createEditBreadcrumbs({
  resourceSegment = DEFAULT_RESOURCE_SEGMENT,
  listLabel,
  listPath,
  detailLabel,
  detailPath,
  editLabel = "Chỉnh sửa",
}: Pick<CreateBreadcrumbsOptions, "resourceSegment" | "listLabel" | "listPath" | "detailLabel" | "detailPath" | "editLabel">): AdminBreadcrumbItem[] {
  const items: AdminBreadcrumbItem[] = [
    { label: listLabel, href: applyResourceSegmentToPath(listPath, resourceSegment) },
  ]
  
  if (detailLabel && detailPath) {
    items.push({ label: truncateBreadcrumbLabel(detailLabel), href: applyResourceSegmentToPath(detailPath, resourceSegment) })
  }
  
  items.push({ label: editLabel, isActive: true })
  return items
}

export function createCreateBreadcrumbs({
  resourceSegment = DEFAULT_RESOURCE_SEGMENT,
  listLabel,
  listPath,
  createLabel = "Tạo mới",
}: Pick<CreateBreadcrumbsOptions, "resourceSegment" | "listLabel" | "listPath" | "createLabel">): AdminBreadcrumbItem[] {
  return [
    { label: listLabel, href: applyResourceSegmentToPath(listPath, resourceSegment) },
    { label: createLabel, isActive: true },
  ]
}

export function createNestedBreadcrumbs({
  resourceSegment = DEFAULT_RESOURCE_SEGMENT,
  parentLabel,
  parentPath,
  currentLabel,
}: {
  resourceSegment?: string
  parentLabel: string
  parentPath: string
  currentLabel: string
}): AdminBreadcrumbItem[] {
  return [
    { label: parentLabel, href: applyResourceSegmentToPath(parentPath, resourceSegment) },
    { label: currentLabel, isActive: true },
  ]
}

function getResourceSingularName(resourceName: string): string {
  const specialCases: Record<string, string> = {
    categories: "category",
    tags: "tag",
    users: "user",
    posts: "post",
    comments: "comment",
    roles: "role",
    sessions: "session",
    students: "student",
    "contact-requests": "contact-request",
    notifications: "notification",
  }
  
  if (specialCases[resourceName]) {
    return specialCases[resourceName]
  }
  
  if (resourceName.endsWith("s")) {
    return resourceName.slice(0, -1)
  }
  
  return resourceName
}

export function createResourceEditOnSuccess({
  queryClient,
  resourceId,
  allQueryKey,
  detailQueryKey,
  resourceName,
  getRecordName,
  onSuccess,
}: {
  queryClient: ReturnType<typeof import("@tanstack/react-query").useQueryClient>
  resourceId: string | undefined
  allQueryKey: readonly unknown[]
  detailQueryKey: (id: string) => readonly unknown[]
  resourceName: string
  getRecordName?: (responseData: Record<string, unknown>) => string | undefined
  onSuccess?: () => void
}) {
  return async (response: import("axios").AxiosResponse) => {
    const responseData = response?.data?.data

    await queryClient.invalidateQueries({ queryKey: allQueryKey, refetchType: "active" })
    await queryClient.refetchQueries({ queryKey: allQueryKey, type: "active" })
    if (resourceId) {
      await queryClient.invalidateQueries({ queryKey: detailQueryKey(resourceId), refetchType: "active" })
      await queryClient.refetchQueries({ queryKey: detailQueryKey(resourceId), type: "active" })
    }

    const recordName = getRecordName?.(responseData) || (responseData?.name as string | undefined)
    const singularName = getResourceSingularName(resourceName)
    logActionFlow(resourceName, "update", "success", {
      [`${singularName}Id`]: resourceId,
      [`${singularName}Name`]: recordName,
      responseStatus: response?.status,
      cacheStrategy: "invalidate-and-refetch-nextjs16",
    })

    onSuccess?.()
  }
}


