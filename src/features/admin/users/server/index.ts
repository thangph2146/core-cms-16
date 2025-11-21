/**
 * Server-side exports for Users feature
 * 
 * Structure:
 * - queries.ts: Non-cached database queries
 * - cache.ts: Cached functions using React cache()
 * - mutations.ts: Data mutations (create, update, delete)
 * - helpers.ts: Shared helper functions
 * - notifications.ts: Realtime notifications via Socket.IO
 */

// Queries (non-cached)
export {
  listUsers,
  getUserById,
  type ListUsersInput,
  type ListedUser,
  type UserDetail,
  type ListUsersResult,
} from "./queries"

// Cache functions
export {
  listUsersCached,
  getUserDetailById,
  getRolesCached,
  getUserColumnOptionsCached,
  getActiveUsersForSelectCached,
} from "./cache"

// Mutations
export {
  createUser,
  updateUser,
  softDeleteUser,
  hardDeleteUser,
  restoreUser,
  bulkSoftDeleteUsers,
  bulkRestoreUsers,
  bulkHardDeleteUsers,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "./mutations"

// Validation types
export {
  type CreateUserSchema,
  type UpdateUserSchema,
} from "./validation"

// Helpers
export {
  mapUserRecord,
  buildWhereClause,
  serializeUserForTable,
  serializeUsersList,
  serializeUserDetail,
  type UserWithRoles,
} from "./helpers"

// Notifications
export {
  notifySuperAdminsOfUserAction,
} from "./notifications"

