/**
 * Constants cho messages và labels trong posts feature
 */

export const POST_MESSAGES = {
  // Success messages
  DELETE_SUCCESS: "Xóa thành công",
  RESTORE_SUCCESS: "Khôi phục thành công",
  HARD_DELETE_SUCCESS: "Xóa vĩnh viễn thành công",
  
  // Error messages
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
  NO_DELETE_PERMISSION: "Bạn không có quyền xóa bài viết",
  NO_RESTORE_PERMISSION: "Bạn không có quyền khôi phục bài viết",
  
  // Generic errors
  UNKNOWN_ERROR: "Đã xảy ra lỗi không xác định",
  LOAD_ERROR: "Không thể tải danh sách bài viết",
} as const

export const POST_LABELS = {
  // Status labels
  ACTIVE: "Hoạt động",
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
  NO_POSTS: "Không tìm thấy bài viết nào phù hợp",
  NO_DELETED_POSTS: "Không tìm thấy bài viết đã xóa nào",
  
  // Selection messages
  SELECTED_POSTS: (count: number) => `Đã chọn ${count} bài viết`,
  SELECTED_DELETED_POSTS: (count: number) => `Đã chọn ${count} bài viết (đã xóa)`,
  DELETE_SELECTED: (count: number) => `Xóa đã chọn (${count})`,
  RESTORE_SELECTED: (count: number) => `Khôi phục (${count})`,
  HARD_DELETE_SELECTED: (count: number) => `Xóa vĩnh viễn (${count})`,
  
  // Titles
  MANAGE_POSTS: "Quản lý bài viết",
  ADD_NEW: "Thêm mới",
} as const

export const POST_CONFIRM_MESSAGES = {
  DELETE_TITLE: (count?: number) => count ? `Xóa ${count} bài viết?` : "Xóa bài viết?",
  DELETE_DESCRIPTION: (count?: number, name?: string) =>
    count
      ? `Bạn có chắc chắn muốn xóa ${count} bài viết? Chúng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
      : `Bạn có chắc chắn muốn xóa bài viết "${name || ""}"? Bài viết sẽ được chuyển vào thùng rác và có thể khôi phục sau.`,
  
  RESTORE_TITLE: (count?: number) => count ? `Khôi phục ${count} bài viết?` : "Khôi phục bài viết?",
  RESTORE_DESCRIPTION: (count?: number, name?: string) =>
    count
      ? `Bạn có chắc chắn muốn khôi phục ${count} bài viết? Chúng sẽ được chuyển về trạng thái hoạt động.`
      : `Bạn có chắc chắn muốn khôi phục bài viết "${name || ""}"? Bài viết sẽ được chuyển về trạng thái hoạt động.`,
  
  HARD_DELETE_TITLE: (count?: number) =>
    count ? `Xóa vĩnh viễn ${count} bài viết?` : "Xóa vĩnh viễn bài viết?",
  HARD_DELETE_DESCRIPTION: (count?: number, name?: string) =>
    count
      ? `Hành động này sẽ xóa vĩnh viễn ${count} bài viết khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
      : `Hành động này sẽ xóa vĩnh viễn bài viết "${name || ""}" khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`,
  
  CONFIRM_LABEL: "Xóa",
  RESTORE_LABEL: "Khôi phục",
  HARD_DELETE_LABEL: "Xóa vĩnh viễn",
  CANCEL_LABEL: "Hủy",
} as const

