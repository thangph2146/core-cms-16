/**
 * Components Exports
 * 
 * Structure:
 * - Server Components: *.tsx (no "use client")
 * - Client Components: *.client.tsx hoặc *.tsx với "use client"
 */

// Server Components
export { ResourceTable, ResourceTableWithSuspense } from "./resource-table"
export { ResourceDetail, ResourceDetailWithSuspense, ResourceDetailAsync } from "./resource-detail"
export type { ResourceDetailAsyncProps } from "./resource-detail"

// Client Components
export { ResourceTableClient } from "./resource-table.client"
export { ResourceForm } from "./resource-form"
export { ResourceDetailPage } from "./resource-detail-page"
export { NotFoundMessage } from "./not-found-message"
export { SelectionActionsWrapper } from "./selection-actions-wrapper"
export { FieldItem } from "./field-item"

// Suspense Wrappers
export {
  SuspenseWrapper,
  FormPageSuspense,
  TablePageSuspense,
  MessagesPageSuspense,
} from "./suspense-wrapper"
export type {
  SuspenseWrapperProps,
  FormPageSuspenseProps,
  TablePageSuspenseProps,
  MessagesPageSuspenseProps,
} from "./suspense-wrapper"

// Types
export type { ResourceTableProps } from "./resource-table"
export type { ResourceDetailProps } from "./resource-detail"
export type { ResourceTableClientProps } from "./resource-table.client"
export type { ResourceFormProps, ResourceFormField, ResourceFormSection } from "./resource-form"
export type { ResourceDetailPageProps, ResourceDetailField, ResourceDetailSection } from "./resource-detail-page"
export type { FieldItemProps } from "./field-item"
