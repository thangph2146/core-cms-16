/**
 * Server-side exports for Notifications feature
 * 
 * Structure:
 * - queries.ts: Non-cached database queries (theo chuẩn Next.js 16: không cache admin data)
 * - helpers.ts: Helper functions for serialization
 * 
 * LƯU Ý: cache.ts đã được xóa theo chuẩn Next.js 16 - không cache admin data
 */

// Non-cached queries (theo chuẩn Next.js 16: không cache admin data)
export {
  listNotifications,
  getNotificationById,
  getNotificationColumnOptions,
  type ListNotificationsInput,
  type ListedNotification,
  type ListNotificationsResult,
} from "./queries"

// Helpers
export {
  serializeNotificationForTable,
  serializeNotificationsList,
  serializeNotificationDetail,
} from "./helpers"

