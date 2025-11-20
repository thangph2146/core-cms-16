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
export { useResourceInitialDataCache } from "./use-resource-initial-data-cache"

