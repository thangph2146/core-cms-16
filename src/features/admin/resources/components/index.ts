/**
 * Components Exports
 * 
 * Structure:
 * - Server Components: *.tsx (no "use client")
 * - Client Components: *.client.tsx hoặc *.tsx với "use client"
 */

// Server Components
export { ResourceTable } from "./resource-table"
export { ResourceDetail } from "./resource-detail"

// Client Components
export { ResourceTableClient } from "./resource-table.client"
export { ResourceForm } from "./resource-form"
export { ResourceDetailPage } from "./resource-detail-page"

// Types
export type { ResourceTableProps } from "./resource-table"
export type { ResourceDetailProps } from "./resource-detail"
export type { ResourceTableClientProps } from "./resource-table.client"
export type { ResourceFormProps, ResourceFormField } from "./resource-form"
export type { ResourceDetailPageProps, ResourceDetailField } from "./resource-detail-page"

