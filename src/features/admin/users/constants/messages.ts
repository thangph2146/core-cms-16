export const USER_MESSAGES = {
  // Success messages
  DELETE_SUCCESS: "Xóa thành công",
  RESTORE_SUCCESS: "Khôi phục thành công",
  HARD_DELETE_SUCCESS: "Xóa vĩnh viễn thành công",
  TOGGLE_ACTIVE_SUCCESS: "Cập nhật trạng thái thành công",

  // Error messages
  DELETE_ERROR: "Xóa thất bại",
  RESTORE_ERROR: "Khôi phục thất bại",
  HARD_DELETE_ERROR: "Xóa vĩnh viễn thất bại",
  TOGGLE_ACTIVE_ERROR: "Cập nhật trạng thái thất bại",

  // Bulk action messages
  BULK_DELETE_SUCCESS: "Xóa hàng loạt thành công",
  BULK_RESTORE_SUCCESS: "Khôi phục hàng loạt thành công",
  BULK_HARD_DELETE_SUCCESS: "Xóa vĩnh viễn hàng loạt thành công",

  BULK_DELETE_ERROR: "Xóa hàng loạt thất bại",
  BULK_RESTORE_ERROR: "Khôi phục hàng loạt thất bại",
  BULK_HARD_DELETE_ERROR: "Xóa vĩnh viễn hàng loạt thất bại",

  // Permission errors
  NO_PERMISSION: "Không có quyền",
  NO_DELETE_PERMISSION: "Bạn không có quyền xóa người dùng",
  NO_RESTORE_PERMISSION: "Bạn không có quyền khôi phục người dùng",
  NO_MANAGE_PERMISSION: "Bạn không có quyền quản lý người dùng",

  // Super admin protection
  CANNOT_DELETE_SUPER_ADMIN: "Không thể xóa tài khoản super admin",
  CANNOT_DEACTIVATE_SUPER_ADMIN: "Không thể vô hiệu hóa tài khoản super admin",

  // Generic errors
  UNKNOWN_ERROR: "Đã xảy ra lỗi không xác định",
  LOAD_ERROR: "Không thể tải danh sách người dùng",
} as const

export const USER_LABELS = {
  // Status labels
  ACTIVE: "Hoạt động",
  DELETED: "Đã xóa",
  INACTIVE: "Tạm khóa",
  SUPER_ADMIN: "Super Admin",

  // Action labels
  VIEW_DETAIL: "Xem chi tiết",
  EDIT: "Chỉnh sửa",
  DELETE: "Xóa",
  RESTORE: "Khôi phục",
  HARD_DELETE: "Xóa vĩnh viễn",
  CLEAR_SELECTION: "Bỏ chọn",
  TOGGLE_ACTIVE: "Thay đổi trạng thái",

  // Loading labels
  DELETING: "Đang xóa...",
  RESTORING: "Đang khôi phục...",
  HARD_DELETING: "Đang xóa vĩnh viễn...",
  TOGGLING_ACTIVE: "Đang cập nhật trạng thái...",

  // View mode labels
  ACTIVE_VIEW: "Đang hoạt động",
  DELETED_VIEW: "Đã xóa",

  // Empty messages
  NO_USERS: "Không tìm thấy người dùng nào phù hợp",
  NO_DELETED_USERS: "Không có người dùng đã xóa",

  // Selection messages
  SELECTED_USERS: (count: number) => `Đã chọn ${count} người dùng`,
  SELECTED_DELETED_USERS: (count: number) => `Đã chọn ${count} người dùng (đã xóa)`,
  DELETE_SELECTED: (count: number) => `Xóa đã chọn (${count})`,
  RESTORE_SELECTED: (count: number) => `Khôi phục (${count})`,
  HARD_DELETE_SELECTED: (count: number) => `Xóa vĩnh viễn (${count})`,

  // Titles
  MANAGE_USERS: "Quản lý người dùng",
  ADD_NEW: "Thêm mới",
} as const

export const USER_CONFIRM_MESSAGES = {
  DELETE_TITLE: (count?: number) => count ? `Xóa ${count} người dùng?` : "Xóa người dùng?",
  DELETE_DESCRIPTION: (count?: number, email?: string) =>
    count
      ? `Bạn có chắc chắn muốn xóa ${count} người dùng? Họ sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
      : `Bạn có chắc chắn muốn xóa người dùng "${email || ""}"? Người dùng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`,

  RESTORE_TITLE: (count?: number) => count ? `Khôi phục ${count} người dùng?` : "Khôi phục người dùng?",
  RESTORE_DESCRIPTION: (count?: number, email?: string) =>
    count
      ? `Bạn có chắc chắn muốn khôi phục ${count} người dùng? Họ sẽ được chuyển về trạng thái hoạt động.`
      : `Bạn có chắc chắn muốn khôi phục người dùng "${email || ""}"? Người dùng sẽ được chuyển về trạng thái hoạt động.`,

  HARD_DELETE_TITLE: (count?: number) =>
    count ? `Xóa vĩnh viễn ${count} người dùng?` : "Xóa vĩnh viễn người dùng?",
  HARD_DELETE_DESCRIPTION: (count?: number, email?: string) =>
    count
      ? `Hành động này sẽ xóa vĩnh viễn ${count} người dùng khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
      : `Hành động này sẽ xóa vĩnh viễn người dùng "${email || ""}" khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`,

  CONFIRM_LABEL: "Xóa",
  RESTORE_LABEL: "Khôi phục",
  HARD_DELETE_LABEL: "Xóa vĩnh viễn",
  CANCEL_LABEL: "Hủy",
} as const

