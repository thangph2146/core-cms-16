/**
 * Constants cho messages và labels trong students feature
 */

export const STUDENT_MESSAGES = {
  // Success messages
  TOGGLE_ACTIVE_SUCCESS: "Cập nhật thành công",
  DELETE_SUCCESS: "Xóa thành công",
  RESTORE_SUCCESS: "Khôi phục thành công",
  HARD_DELETE_SUCCESS: "Xóa vĩnh viễn thành công",
  
  // Error messages
  TOGGLE_ACTIVE_ERROR: "Lỗi cập nhật",
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
  NO_MANAGE_PERMISSION: "Bạn không có quyền thay đổi trạng thái học sinh",
  
  // Generic errors
  UNKNOWN_ERROR: "Đã xảy ra lỗi không xác định",
  LOAD_ERROR: "Không thể tải danh sách học sinh",
} as const

export const STUDENT_LABELS = {
  // Status labels
  ACTIVE: "Hoạt động",
  INACTIVE: "Tạm khóa",
  DELETED: "Đã xóa",
  
  // Action labels
  VIEW_DETAIL: "Xem chi tiết",
  EDIT: "Chỉnh sửa",
  TOGGLE_ACTIVE: "Kích hoạt/Vô hiệu hóa",
  DELETE: "Xóa",
  RESTORE: "Khôi phục",
  HARD_DELETE: "Xóa vĩnh viễn",
  CLEAR_SELECTION: "Bỏ chọn",
  
  // View mode labels
  ACTIVE_VIEW: "Đang hoạt động",
  DELETED_VIEW: "Đã xóa",
  ALL_VIEW: "Tất cả",
  
  // Empty messages
  NO_STUDENTS: "Không tìm thấy học sinh nào phù hợp",
  NO_DELETED_STUDENTS: "Không tìm thấy học sinh đã xóa nào",
  
  // Selection messages
  SELECTED_STUDENTS: (count: number) => `Đã chọn ${count} học sinh`,
  SELECTED_DELETED_STUDENTS: (count: number) => `Đã chọn ${count} học sinh (đã xóa)`,
  
  // Table headers
  MANAGE_STUDENTS: "Quản lý học sinh",
  STUDENT_CODE: "Mã học sinh",
  STUDENT_NAME: "Tên học sinh",
  EMAIL: "Email",
  STATUS: "Trạng thái",
  CREATED_AT: "Ngày tạo",
  DELETED_AT: "Ngày xóa",
} as const

export const STUDENT_CONFIRM_MESSAGES = {
  DELETE_TITLE: (count?: number, studentCode?: string) => 
    count ? `Xóa ${count} học sinh?` : `Xóa học sinh ${studentCode}?`,
  DELETE_DESCRIPTION: (count?: number, studentCode?: string) =>
    count
      ? `Bạn có chắc chắn muốn xóa ${count} học sinh? Họ sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
      : `Bạn có chắc chắn muốn xóa học sinh "${studentCode}"? Học sinh sẽ được chuyển vào thùng rác và có thể khôi phục sau.`,
  
  HARD_DELETE_TITLE: (count?: number, studentCode?: string) =>
    count ? `Xóa vĩnh viễn ${count} học sinh?` : `Xóa vĩnh viễn học sinh ${studentCode}?`,
  HARD_DELETE_DESCRIPTION: (count?: number, studentCode?: string) =>
    count
      ? `Hành động này sẽ xóa vĩnh viễn ${count} học sinh khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
      : `Hành động này sẽ xóa vĩnh viễn học sinh "${studentCode}" khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`,
  
  CONFIRM_LABEL: "Xóa",
  HARD_DELETE_LABEL: "Xóa vĩnh viễn",
  CANCEL_LABEL: "Hủy",
} as const

