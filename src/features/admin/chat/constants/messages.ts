/**
 * Constants cho messages và labels trong chat groups feature
 */

export const GROUP_MESSAGES = {
  // Success messages
  DELETE_SUCCESS: "Xóa nhóm thành công",
  RESTORE_SUCCESS: "Khôi phục nhóm thành công",
  HARD_DELETE_SUCCESS: "Xóa vĩnh viễn nhóm thành công",
  UPDATE_SUCCESS: "Cập nhật nhóm thành công",

  // Error messages
  DELETE_ERROR: "Xóa nhóm thất bại",
  RESTORE_ERROR: "Khôi phục nhóm thất bại",
  HARD_DELETE_ERROR: "Xóa vĩnh viễn nhóm thất bại",
  UPDATE_ERROR: "Cập nhật nhóm thất bại",

  // Permission errors
  NO_PERMISSION: "Không có quyền",
  NO_DELETE_PERMISSION: "Bạn không có quyền xóa nhóm",
  NO_RESTORE_PERMISSION: "Bạn không có quyền khôi phục nhóm",
  NO_UPDATE_PERMISSION: "Bạn không có quyền cập nhật nhóm",

  // Generic errors
  UNKNOWN_ERROR: "Đã xảy ra lỗi không xác định",
  LOAD_ERROR: "Không thể tải thông tin nhóm",
} as const

export const GROUP_LABELS = {
  // Status labels
  ACTIVE: "Hoạt động",
  DELETED: "Đã xóa",

  // Action labels
  EDIT: "Chỉnh sửa",
  DELETE: "Xóa nhóm",
  RESTORE: "Khôi phục",
  HARD_DELETE: "Xóa vĩnh viễn",
  SOFT_DELETE: "Xóa mềm (có thể khôi phục)",

  // Loading labels
  DELETING: "Đang xóa...",
  RESTORING: "Đang khôi phục...",
  HARD_DELETING: "Đang xóa vĩnh viễn...",
  UPDATING: "Đang cập nhật...",

  // Titles
  MANAGE_GROUP: "Quản lý nhóm",
} as const

export const GROUP_CONFIRM_MESSAGES = {
  DELETE_TITLE: (name?: string) => name ? `Xóa nhóm "${name}"?` : "Xóa nhóm?",
  DELETE_DESCRIPTION: (name?: string) =>
    `Bạn có chắc chắn muốn xóa nhóm "${name || ""}"? Nhóm sẽ được chuyển vào thùng rác và có thể khôi phục sau.`,

  RESTORE_TITLE: (name?: string) => name ? `Khôi phục nhóm "${name}"?` : "Khôi phục nhóm?",
  RESTORE_DESCRIPTION: (name?: string) =>
    `Bạn có chắc chắn muốn khôi phục nhóm "${name || ""}"? Nhóm sẽ được chuyển về trạng thái hoạt động.`,

  HARD_DELETE_TITLE: (name?: string) =>
    name ? `Xóa vĩnh viễn nhóm "${name}"?` : "Xóa vĩnh viễn nhóm?",
  HARD_DELETE_DESCRIPTION: (name?: string) =>
    `Hành động này sẽ xóa vĩnh viễn nhóm "${name || ""}" khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`,

  CONFIRM_LABEL: "Xóa",
  RESTORE_LABEL: "Khôi phục",
  HARD_DELETE_LABEL: "Xóa vĩnh viễn",
  CANCEL_LABEL: "Hủy",
} as const

