/**
 * Components Exports
 * 
 * Structure:
 * - Server Components: *.tsx (no "use client")
 * - Client Components: *.client.tsx ("use client")
 */

// Server Components
export { UsersTable } from "./users-table"
export { UserDetail } from "./user-detail"
export { UserCreate } from "./user-create"
export { UserEdit } from "./user-edit"

// Client Components
export { UsersTableClient } from "./users-table.client"
export { UserDetailClient } from "./user-detail.client"
export { UserCreateClient } from "./user-create.client"
export { UserEditClient } from "./user-edit.client"

// Types
export type { UsersTableProps } from "./users-table"
export type { UserDetailProps } from "./user-detail"
export type { UserCreateProps } from "./user-create"
export type { UserEditProps } from "./user-edit"
export type { UserDetailClientProps, UserDetailData } from "./user-detail.client"
export type { UserCreateClientProps } from "./user-create.client"
export type { UserEditClientProps } from "./user-edit.client"

