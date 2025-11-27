export const ROLE_MESSAGES = {
  // Success messages
  TOGGLE_ACTIVE_SUCCESS: "Cập nhật thành công",
  TOGGLE_INACTIVE_SUCCESS: "Cập nhật thành công",
  DELETE_SUCCESS: "Xóa thành công",
  RESTORE_SUCCESS: "Khôi phục thành công",
  HARD_DELETE_SUCCESS: "Xóa vĩnh viễn thành công",
  
  // Error messages
  TOGGLE_ACTIVE_ERROR: "Lỗi cập nhật",
  TOGGLE_INACTIVE_ERROR: "Lỗi cập nhật",
  DELETE_ERROR: "Xóa thất bại",
  RESTORE_ERROR: "Khôi phục thất bại",
  HARD_DELETE_ERROR: "Xóa vĩnh viễn thất bại",
  
  // Bulk action messages
  BULK_DELETE_SUCCESS: "Xóa hàng loạt thành công",
  BULK_RESTORE_SUCCESS: "Khôi phục hàng loạt thành công",
  BULK_HARD_DELETE_SUCCESS: "Xóa vĩnh viễn hàng loạt thành công",
  
  BULK_DELETE_ERROR: "Xóa hàng loạt thất bại",
  BULK_RESTORE_ERROR: "Khôi phục hàng loạt thất bại",
  BULK_HARD_DELETE_ERROR: "Xóa vĩnh viễn hàng loạt thất bại",
  
  // Permission errors
  NO_PERMISSION: "Không có quyền",
  NO_MANAGE_PERMISSION: "Bạn không có quyền thay đổi trạng thái vai trò",
  NO_DELETE_PERMISSION: "Bạn không có quyền xóa vai trò",
  NO_RESTORE_PERMISSION: "Bạn không có quyền khôi phục vai trò",
  
  // Special role errors
  CANNOT_MODIFY_SUPER_ADMIN: "Không thể thay đổi vai trò super_admin",
  CANNOT_DELETE_SUPER_ADMIN: "Không thể xóa vai trò super_admin",
  CANNOT_HARD_DELETE_SUPER_ADMIN: "Không thể xóa vĩnh viễn vai trò super_admin",
  
  // Generic errors
  UNKNOWN_ERROR: "Đã xảy ra lỗi không xác định",
  LOAD_ERROR: "Không thể tải danh sách vai trò",
} as const

export const ROLE_LABELS = {
  // Status labels
  ACTIVE: "Hoạt động",
  INACTIVE: "Tạm khóa",
  DELETED: "Đã xóa",
  
  // Action labels
  VIEW_DETAIL: "Xem chi tiết",
  EDIT: "Chỉnh sửa",
  DELETE: "Xóa",
  RESTORE: "Khôi phục",
  HARD_DELETE: "Xóa vĩnh viễn",
  CLEAR_SELECTION: "Bỏ chọn",
  
  // Loading labels
  DELETING: "Đang xóa...",
  RESTORING: "Đang khôi phục...",
  HARD_DELETING: "Đang xóa vĩnh viễn...",
  
  // View mode labels
  ACTIVE_VIEW: "Đang hoạt động",
  DELETED_VIEW: "Đã xóa",
  
  // Empty messages
  NO_ROLES: "Không tìm thấy vai trò nào phù hợp",
  NO_DELETED_ROLES: "Không có vai trò đã xóa",
  
  // Selection messages
  SELECTED_ROLES: (count: number) => `Đã chọn ${count} vai trò`,
  SELECTED_DELETED_ROLES: (count: number) => `Đã chọn ${count} vai trò (đã xóa)`,
  DELETE_SELECTED: (count: number) => `Xóa đã chọn (${count})`,
  RESTORE_SELECTED: (count: number) => `Khôi phục (${count})`,
  HARD_DELETE_SELECTED: (count: number) => `Xóa vĩnh viễn (${count})`,
  
  // Hints
  CANNOT_DELETE_SUPER_ADMIN_HINT: "(Không thể xóa vai trò super_admin)",
  CANNOT_HARD_DELETE_SUPER_ADMIN_HINT: "(Không thể xóa vĩnh viễn super_admin)",
  
  // Titles
  MANAGE_ROLES: "Quản lý vai trò",
  ADD_NEW: "Thêm mới",
  
  // Cannot delete messages
  CANNOT_DELETE: "Không thể xóa",
  CANNOT_DELETE_SUPER_ADMIN: "Không thể xóa vai trò super_admin",
  CANNOT_HARD_DELETE_SUPER_ADMIN: "Không thể xóa vĩnh viễn vai trò super_admin",
} as const

export const ROLE_CONFIRM_MESSAGES = {
  DELETE_TITLE: (count?: number) => count ? `Xóa ${count} vai trò?` : "Xóa vai trò?",
  DELETE_DESCRIPTION: (count?: number, displayName?: string) =>
    count
      ? `Bạn có chắc chắn muốn xóa ${count} vai trò? Chúng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
      : `Bạn có chắc chắn muốn xóa vai trò "${displayName || ""}"? Vai trò sẽ được chuyển vào thùng rác và có thể khôi phục sau.`,
  
  RESTORE_TITLE: (count?: number) => count ? `Khôi phục ${count} vai trò?` : "Khôi phục vai trò?",
  RESTORE_DESCRIPTION: (count?: number, displayName?: string) =>
    count
      ? `Bạn có chắc chắn muốn khôi phục ${count} vai trò? Chúng sẽ được chuyển về trạng thái hoạt động.`
      : `Bạn có chắc chắn muốn khôi phục vai trò "${displayName || ""}"? Vai trò sẽ được chuyển về trạng thái hoạt động.`,
  
  HARD_DELETE_TITLE: (count?: number) =>
    count ? `Xóa vĩnh viễn ${count} vai trò?` : "Xóa vĩnh viễn vai trò?",
  HARD_DELETE_DESCRIPTION: (count?: number, displayName?: string) =>
    count
      ? `Hành động này sẽ xóa vĩnh viễn ${count} vai trò khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
      : `Hành động này sẽ xóa vĩnh viễn vai trò "${displayName || ""}" khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`,
  
  CONFIRM_LABEL: "Xóa",
  RESTORE_LABEL: "Khôi phục",
  HARD_DELETE_LABEL: "Xóa vĩnh viễn",
  CANCEL_LABEL: "Hủy",
} as const

