/**
 * Prisma Resource Map
 *
 * Tập trung danh sách resource dựa trên schema.prisma để dùng cho route/API helpers.
 */

export interface ResourceMapEntry {
  /** Key được dùng trong apiRoutes hoặc các config khác */
  key: string
  /** Tên resource tương ứng trong route-config (slug) */
  resourceName: string
  /** Có bỏ qua resource này không (ví dụ pivot tables) */
  enabled?: boolean
}

export const prismaResourceMap: ReadonlyArray<ResourceMapEntry> = [
  { key: "users", resourceName: "users" },
  { key: "roles", resourceName: "roles" },
  { key: "sessions", resourceName: "sessions" },
  { key: "students", resourceName: "students" },
  { key: "posts", resourceName: "posts" },
  { key: "categories", resourceName: "categories" },
  { key: "tags", resourceName: "tags" },
  { key: "comments", resourceName: "comments" },
  { key: "groups", resourceName: "groups" },
  { key: "messages", resourceName: "messages" },
  { key: "contactRequests", resourceName: "contact-requests" },
  { key: "notifications", resourceName: "notifications" },
] as const
