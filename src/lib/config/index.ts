/**
 * Config Barrel Export
 * 
 * Export tất cả configuration files từ một nơi
 */

export { logger } from "./logger"

export { getMenuData } from "./menu-data"
export type { MenuItem, MenuSubItem, MenuProject } from "./navigation-types"

export { appConfig, getAppBranding, type AppBranding } from "./app-config"

export {
  apiPathConfig,
  withApiBase,
  withAdminApiBase,
  stripApiBase,
  stripAdminApiBase,
} from "./api-paths"

export {
  createSuccessResponse,
  createErrorResponse,
  type ApiResponsePayload,
} from "./api-response"

export {
  prismaResourceMap,
  type ResourceMapEntry,
} from "./resource-map"

export {
  appFeatures,
  buildNavigationMenu,
  getFeatureApiConfig,
  getFeatureComponentStrategies,
  type FeatureComponentStrategy,
  type FeatureKey,
} from "./app-features"
