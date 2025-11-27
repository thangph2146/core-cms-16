export const SESSION_MESSAGES = {
  // Success messages
  DELETE_SUCCESS: "Xóa thành công",
  RESTORE_SUCCESS: "Khôi phục thành công",
  HARD_DELETE_SUCCESS: "Xóa vĩnh viễn thành công",
  TOGGLE_ACTIVE_SUCCESS: "Cập nhật trạng thái thành công",
  TOGGLE_INACTIVE_SUCCESS: "Cập nhật trạng thái thành công",
  
  // Error messages
  DELETE_ERROR: "Xóa thất bại",
  RESTORE_ERROR: "Khôi phục thất bại",
  HARD_DELETE_ERROR: "Xóa vĩnh viễn thất bại",
  TOGGLE_ACTIVE_ERROR: "Cập nhật trạng thái thất bại",
  TOGGLE_INACTIVE_ERROR: "Cập nhật trạng thái thất bại",
  
  // Bulk action messages
  BULK_DELETE_SUCCESS: "Xóa hàng loạt thành công",
  BULK_RESTORE_SUCCESS: "Khôi phục hàng loạt thành công",
  BULK_HARD_DELETE_SUCCESS: "Xóa vĩnh viễn hàng loạt thành công",
  
  BULK_DELETE_ERROR: "Xóa hàng loạt thất bại",
  BULK_RESTORE_ERROR: "Khôi phục hàng loạt thất bại",
  BULK_HARD_DELETE_ERROR: "Xóa vĩnh viễn hàng loạt thất bại",
  
  // Permission errors
  NO_PERMISSION: "Không có quyền",
  NO_DELETE_PERMISSION: "Bạn không có quyền xóa session",
  NO_RESTORE_PERMISSION: "Bạn không có quyền khôi phục session",
  NO_MANAGE_PERMISSION: "Bạn không có quyền quản lý session",
  
  // Generic errors
  UNKNOWN_ERROR: "Đã xảy ra lỗi không xác định",
  LOAD_ERROR: "Không thể tải danh sách session",
} as const

export const SESSION_LABELS = {
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
  TOGGLE_ACTIVE: "Kích hoạt",
  TOGGLE_INACTIVE: "Vô hiệu hóa",
  
  // Loading labels
  DELETING: "Đang xóa...",
  RESTORING: "Đang khôi phục...",
  HARD_DELETING: "Đang xóa vĩnh viễn...",
  TOGGLING: "Đang cập nhật...",
  
  // View mode labels
  ACTIVE_VIEW: "Đang hoạt động",
  DELETED_VIEW: "Đã xóa",
  
  // Empty messages
  NO_SESSIONS: "Không tìm thấy session nào phù hợp",
  NO_DELETED_SESSIONS: "Không tìm thấy session đã xóa nào",
  
  // Selection messages
  SELECTED_SESSIONS: (count: number) => `Đã chọn ${count} session`,
  SELECTED_DELETED_SESSIONS: (count: number) => `Đã chọn ${count} session (đã xóa)`,
  DELETE_SELECTED: (count: number) => `Xóa đã chọn (${count})`,
  RESTORE_SELECTED: (count: number) => `Khôi phục (${count})`,
  HARD_DELETE_SELECTED: (count: number) => `Xóa vĩnh viễn (${count})`,
  
  // Titles
  MANAGE_SESSIONS: "Quản lý session",
  ADD_NEW: "Thêm mới",
  
  // Table headers
  USER: "Người dùng",
  IP_ADDRESS: "IP Address",
  USER_AGENT: "User Agent",
  STATUS: "Trạng thái",
  EXPIRES_AT: "Hết hạn",
  CREATED_AT: "Ngày tạo",
} as const

export const SESSION_CONFIRM_MESSAGES = {
  TOGGLE_ACTIVE_TITLE: (count?: number, userName?: string) => 
    count ? `Kích hoạt ${count} session?` : `Kích hoạt session của "${userName || ""}"?`,
  TOGGLE_ACTIVE_DESCRIPTION: (count?: number, userName?: string) =>
    count
      ? `Bạn có chắc chắn muốn kích hoạt ${count} session? Chúng sẽ được chuyển về trạng thái hoạt động.`
      : `Bạn có chắc chắn muốn kích hoạt session của "${userName || ""}"? Session sẽ được chuyển về trạng thái hoạt động.`,
  
  TOGGLE_INACTIVE_TITLE: (count?: number, userName?: string) => 
    count ? `Vô hiệu hóa ${count} session?` : `Vô hiệu hóa session của "${userName || ""}"?`,
  TOGGLE_INACTIVE_DESCRIPTION: (count?: number, userName?: string) =>
    count
      ? `Bạn có chắc chắn muốn vô hiệu hóa ${count} session? Chúng sẽ được chuyển về trạng thái tạm khóa.`
      : `Bạn có chắc chắn muốn vô hiệu hóa session của "${userName || ""}"? Session sẽ được chuyển về trạng thái tạm khóa.`,
  
  DELETE_TITLE: (count?: number, _userName?: string) => count ? `Xóa ${count} session?` : "Xóa session?",
  DELETE_DESCRIPTION: (count?: number, _userName?: string) =>
    count
      ? `Bạn có chắc chắn muốn xóa ${count} session? Chúng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
      : `Bạn có chắc chắn muốn xóa session? Session sẽ được chuyển vào thùng rác và có thể khôi phục sau.`,
  
  RESTORE_TITLE: (count?: number, _userName?: string) => count ? `Khôi phục ${count} session?` : "Khôi phục session?",
  RESTORE_DESCRIPTION: (count?: number, _userName?: string) =>
    count
      ? `Bạn có chắc chắn muốn khôi phục ${count} session? Chúng sẽ được chuyển về trạng thái hoạt động.`
      : `Bạn có chắc chắn muốn khôi phục session? Session sẽ được chuyển về trạng thái hoạt động.`,
  
  HARD_DELETE_TITLE: (count?: number, _userName?: string) =>
    count ? `Xóa vĩnh viễn ${count} session?` : "Xóa vĩnh viễn session?",
  HARD_DELETE_DESCRIPTION: (count?: number, userName?: string) =>
    count
      ? `Hành động này sẽ xóa vĩnh viễn ${count} session khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
      : `Hành động này sẽ xóa vĩnh viễn session của "${userName || ""}" khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`,
  
  TOGGLE_ACTIVE_LABEL: "Kích hoạt",
  TOGGLE_INACTIVE_LABEL: "Vô hiệu hóa",
  CONFIRM_LABEL: "Xóa",
  RESTORE_LABEL: "Khôi phục",
  HARD_DELETE_LABEL: "Xóa vĩnh viễn",
  CANCEL_LABEL: "Hủy",
} as const

