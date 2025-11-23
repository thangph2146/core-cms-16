/**
 * Shared Hooks for Admin Resources
 */

export { useResourceFormSubmit } from "./use-resource-form-submit"
export type { UseResourceFormSubmitOptions, UseResourceFormSubmitResult } from "./use-resource-form-submit"

// Re-export existing hooks
export { useFilterOptions } from "./use-filter-options"
export { useDynamicFilterOptions } from "./use-dynamic-filter-options"

// Table helpers
export { useResourceTableRefresh } from "./use-resource-table-refresh"
export { useResourceTableLoader } from "./use-resource-table-loader"
export { runResourceRefresh } from "./resource-refresh"
export { useResourceBulkProcessing } from "./use-resource-bulk-processing"

// Navigation helpers
export { useResourceNavigation } from "./use-resource-navigation"
export type { UseResourceNavigationOptions, UseResourceNavigationResult } from "./use-resource-navigation"

// Detail data helpers
export { useResourceDetailData } from "./use-resource-detail-data"

// Table logger helpers
export { useResourceTableLogger } from "./use-resource-table-logger"

