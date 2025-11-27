export const CONTACT_REQUEST_MESSAGES = {
  // Success messages
  MARK_READ_SUCCESS: "Đã đánh dấu đã đọc",
  MARK_UNREAD_SUCCESS: "Đã đánh dấu chưa đọc",
  DELETE_SUCCESS: "Xóa thành công",
  RESTORE_SUCCESS: "Khôi phục thành công",
  HARD_DELETE_SUCCESS: "Xóa vĩnh viễn thành công",
  
  // Error messages
  MARK_READ_ERROR: "Đánh dấu đã đọc thất bại",
  MARK_UNREAD_ERROR: "Đánh dấu chưa đọc thất bại",
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
  NO_UPDATE_PERMISSION: "Bạn không có quyền thay đổi trạng thái đọc của yêu cầu liên hệ",
  
  // Generic errors
  UNKNOWN_ERROR: "Đã xảy ra lỗi không xác định",
  LOAD_ERROR: "Không thể tải danh sách yêu cầu liên hệ",
} as const

export const CONTACT_REQUEST_LABELS = {
  // Status labels
  NEW: "Mới",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
  CLOSED: "Đã đóng",
  
  // Priority labels
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
  
  // Read status labels
  READ: "Đã đọc",
  UNREAD: "Chưa đọc",
  DELETED: "Đã xóa",
  
  // Action labels
  VIEW_DETAIL: "Xem chi tiết",
  EDIT: "Chỉnh sửa",
  MARK_READ: "Đánh dấu đã đọc",
  MARK_UNREAD: "Đánh dấu chưa đọc",
  DELETE: "Xóa",
  RESTORE: "Khôi phục",
  HARD_DELETE: "Xóa vĩnh viễn",
  CLEAR_SELECTION: "Bỏ chọn",
  
  // Loading labels
  MARKING_READ: "Đang đánh dấu đã đọc...",
  MARKING_UNREAD: "Đang đánh dấu chưa đọc...",
  DELETING: "Đang xóa...",
  RESTORING: "Đang khôi phục...",
  HARD_DELETING: "Đang xóa vĩnh viễn...",
  
  // View mode labels
  ACTIVE_VIEW: "Đang hoạt động",
  DELETED_VIEW: "Đã xóa",
  ALL_VIEW: "Tất cả",
  
  // Empty messages
  NO_CONTACT_REQUESTS: "Không tìm thấy yêu cầu liên hệ nào phù hợp",
  NO_DELETED_CONTACT_REQUESTS: "Không tìm thấy yêu cầu liên hệ đã xóa nào",
  
  // Selection messages
  SELECTED_CONTACT_REQUESTS: (count: number) => `Đã chọn ${count} yêu cầu liên hệ`,
  SELECTED_DELETED_CONTACT_REQUESTS: (count: number) => `Đã chọn ${count} yêu cầu liên hệ (đã xóa)`,
  DELETE_SELECTED: (count: number) => `Xóa đã chọn (${count})`,
  RESTORE_SELECTED: (count: number) => `Khôi phục (${count})`,
  HARD_DELETE_SELECTED: (count: number) => `Xóa vĩnh viễn (${count})`,
  
  // Table headers
  MANAGE_CONTACT_REQUESTS: "Quản lý yêu cầu liên hệ",
  NAME: "Tên người liên hệ",
  EMAIL: "Email",
  PHONE: "Số điện thoại",
  SUBJECT: "Tiêu đề",
  STATUS: "Trạng thái",
  PRIORITY: "Độ ưu tiên",
  IS_READ: "Đã đọc",
  CREATED_AT: "Ngày tạo",
  DELETED_AT: "Ngày xóa",
} as const

export const CONTACT_REQUEST_CONFIRM_MESSAGES = {
  MARK_READ_TITLE: (count?: number, subject?: string) => 
    count ? `Đánh dấu đã đọc ${count} yêu cầu liên hệ?` : `Đánh dấu đã đọc yêu cầu liên hệ "${subject}"?`,
  MARK_READ_DESCRIPTION: (count?: number, subject?: string) =>
    count
      ? `Bạn có chắc chắn muốn đánh dấu ${count} yêu cầu liên hệ là đã đọc?`
      : `Bạn có chắc chắn muốn đánh dấu yêu cầu liên hệ "${subject}" là đã đọc?`,
  
  MARK_UNREAD_TITLE: (count?: number, subject?: string) => 
    count ? `Đánh dấu chưa đọc ${count} yêu cầu liên hệ?` : `Đánh dấu chưa đọc yêu cầu liên hệ "${subject}"?`,
  MARK_UNREAD_DESCRIPTION: (count?: number, subject?: string) =>
    count
      ? `Bạn có chắc chắn muốn đánh dấu ${count} yêu cầu liên hệ là chưa đọc?`
      : `Bạn có chắc chắn muốn đánh dấu yêu cầu liên hệ "${subject}" là chưa đọc?`,
  
  DELETE_TITLE: (count?: number, subject?: string) => 
    count ? `Xóa ${count} yêu cầu liên hệ?` : `Xóa yêu cầu liên hệ "${subject}"?`,
  DELETE_DESCRIPTION: (count?: number, subject?: string) =>
    count
      ? `Bạn có chắc chắn muốn xóa ${count} yêu cầu liên hệ? Chúng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
      : `Bạn có chắc chắn muốn xóa yêu cầu liên hệ "${subject}"? Yêu cầu sẽ được chuyển vào thùng rác và có thể khôi phục sau.`,
  
  RESTORE_TITLE: (count?: number, subject?: string) =>
    count ? `Khôi phục ${count} yêu cầu liên hệ?` : `Khôi phục yêu cầu liên hệ "${subject}"?`,
  RESTORE_DESCRIPTION: (count?: number, subject?: string) =>
    count
      ? `Bạn có chắc chắn muốn khôi phục ${count} yêu cầu liên hệ? Chúng sẽ được chuyển về trạng thái hoạt động.`
      : `Bạn có chắc chắn muốn khôi phục yêu cầu liên hệ "${subject}"? Yêu cầu sẽ được chuyển về trạng thái hoạt động.`,
  
  HARD_DELETE_TITLE: (count?: number, subject?: string) =>
    count ? `Xóa vĩnh viễn ${count} yêu cầu liên hệ?` : `Xóa vĩnh viễn yêu cầu liên hệ "${subject}"?`,
  HARD_DELETE_DESCRIPTION: (count?: number, subject?: string) =>
    count
      ? `Hành động này sẽ xóa vĩnh viễn ${count} yêu cầu liên hệ khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
      : `Hành động này sẽ xóa vĩnh viễn yêu cầu liên hệ "${subject}" khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`,
  
  MARK_READ_LABEL: "Đánh dấu đã đọc",
  MARK_UNREAD_LABEL: "Đánh dấu chưa đọc",
  CONFIRM_LABEL: "Xóa",
  RESTORE_LABEL: "Khôi phục",
  HARD_DELETE_LABEL: "Xóa vĩnh viễn",
  CANCEL_LABEL: "Hủy",
} as const

