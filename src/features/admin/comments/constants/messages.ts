/**
 * Constants cho messages và labels trong comments feature
 */

export const COMMENT_MESSAGES = {
  // Success messages
  APPROVE_SUCCESS: "Duyệt thành công",
  UNAPPROVE_SUCCESS: "Hủy duyệt thành công",
  DELETE_SUCCESS: "Xóa thành công",
  RESTORE_SUCCESS: "Khôi phục thành công",
  HARD_DELETE_SUCCESS: "Xóa vĩnh viễn thành công",
  
  // Error messages
  APPROVE_ERROR: "Duyệt thất bại",
  UNAPPROVE_ERROR: "Hủy duyệt thất bại",
  DELETE_ERROR: "Xóa thất bại",
  RESTORE_ERROR: "Khôi phục thất bại",
  HARD_DELETE_ERROR: "Xóa vĩnh viễn thất bại",
  
  // Bulk action messages
  BULK_APPROVE_SUCCESS: "Duyệt hàng loạt thành công",
  BULK_UNAPPROVE_SUCCESS: "Hủy duyệt hàng loạt thành công",
  BULK_DELETE_SUCCESS: "Xóa hàng loạt thành công",
  BULK_RESTORE_SUCCESS: "Khôi phục hàng loạt thành công",
  BULK_HARD_DELETE_SUCCESS: "Xóa vĩnh viễn hàng loạt thành công",
  
  BULK_APPROVE_ERROR: "Duyệt hàng loạt thất bại",
  BULK_UNAPPROVE_ERROR: "Hủy duyệt hàng loạt thất bại",
  BULK_DELETE_ERROR: "Xóa hàng loạt thất bại",
  BULK_RESTORE_ERROR: "Khôi phục hàng loạt thất bại",
  BULK_HARD_DELETE_ERROR: "Xóa vĩnh viễn hàng loạt thất bại",
  
  // Permission errors
  NO_PERMISSION: "Không có quyền",
  NO_APPROVE_PERMISSION: "Bạn không có quyền duyệt/hủy duyệt bình luận",
  
  // Generic errors
  UNKNOWN_ERROR: "Đã xảy ra lỗi không xác định",
  LOAD_ERROR: "Không thể tải danh sách bình luận",
} as const

export const COMMENT_LABELS = {
  // Status labels
  APPROVED: "Đã duyệt",
  PENDING: "Chờ duyệt",
  DELETED: "Đã xóa",
  
  // Action labels
  VIEW_DETAIL: "Xem chi tiết",
  APPROVE: "Duyệt",
  UNAPPROVE: "Hủy duyệt",
  DELETE: "Xóa",
  RESTORE: "Khôi phục",
  HARD_DELETE: "Xóa vĩnh viễn",
  CLEAR_SELECTION: "Bỏ chọn",
  
  // Loading labels
  APPROVING: "Đang duyệt...",
  UNAPPROVING: "Đang hủy duyệt...",
  DELETING: "Đang xóa...",
  RESTORING: "Đang khôi phục...",
  HARD_DELETING: "Đang xóa vĩnh viễn...",
  
  // View mode labels
  ACTIVE_VIEW: "Đang hoạt động",
  DELETED_VIEW: "Đã xóa",
  
  // Empty messages
  NO_COMMENTS: "Không tìm thấy bình luận nào phù hợp",
  NO_DELETED_COMMENTS: "Không tìm thấy bình luận đã xóa nào",
  
  // Selection messages
  SELECTED_COMMENTS: (count: number) => `Đã chọn ${count} bình luận`,
  SELECTED_DELETED_COMMENTS: (count: number) => `Đã chọn ${count} bình luận (đã xóa)`,
  DELETE_SELECTED: (count: number) => `Xóa đã chọn (${count})`,
  RESTORE_SELECTED: (count: number) => `Khôi phục (${count})`,
  HARD_DELETE_SELECTED: (count: number) => `Xóa vĩnh viễn (${count})`,
  APPROVE_SELECTED: (count: number) => `Duyệt (${count})`,
  UNAPPROVE_SELECTED: (count: number) => `Hủy duyệt (${count})`,
  
  // Titles
  MANAGE_COMMENTS: "Quản lý bình luận",
} as const

export const COMMENT_CONFIRM_MESSAGES = {
  APPROVE_TITLE: (count?: number) => count ? `Duyệt ${count} bình luận?` : "Duyệt bình luận?",
  APPROVE_DESCRIPTION: (count?: number) =>
    count
      ? `Bạn có chắc chắn muốn duyệt ${count} bình luận? Chúng sẽ được hiển thị công khai.`
      : "Bạn có chắc chắn muốn duyệt bình luận? Bình luận sẽ được hiển thị công khai.",
  
  UNAPPROVE_TITLE: (count?: number) => count ? `Hủy duyệt ${count} bình luận?` : "Hủy duyệt bình luận?",
  UNAPPROVE_DESCRIPTION: (count?: number) =>
    count
      ? `Bạn có chắc chắn muốn hủy duyệt ${count} bình luận? Chúng sẽ không được hiển thị công khai.`
      : "Bạn có chắc chắn muốn hủy duyệt bình luận? Bình luận sẽ không được hiển thị công khai.",
  
  DELETE_TITLE: (count?: number) => count ? `Xóa ${count} bình luận?` : "Xóa bình luận?",
  DELETE_DESCRIPTION: (count?: number) =>
    count
      ? `Bạn có chắc chắn muốn xóa ${count} bình luận? Chúng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
      : "Bạn có chắc chắn muốn xóa bình luận? Bình luận sẽ được chuyển vào thùng rác và có thể khôi phục sau.",
  
  RESTORE_TITLE: (count?: number) => count ? `Khôi phục ${count} bình luận?` : "Khôi phục bình luận?",
  RESTORE_DESCRIPTION: (count?: number) =>
    count
      ? `Bạn có chắc chắn muốn khôi phục ${count} bình luận? Chúng sẽ được chuyển về trạng thái hoạt động.`
      : "Bạn có chắc chắn muốn khôi phục bình luận? Bình luận sẽ được chuyển về trạng thái hoạt động.",
  
  HARD_DELETE_TITLE: (count?: number) =>
    count ? `Xóa vĩnh viễn ${count} bình luận?` : "Xóa vĩnh viễn bình luận?",
  HARD_DELETE_DESCRIPTION: (count?: number) =>
    count
      ? `Hành động này sẽ xóa vĩnh viễn ${count} bình luận khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
      : "Hành động này sẽ xóa vĩnh viễn bình luận khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?",
  
  APPROVE_LABEL: "Duyệt",
  UNAPPROVE_LABEL: "Hủy duyệt",
  CONFIRM_LABEL: "Xóa",
  RESTORE_LABEL: "Khôi phục",
  HARD_DELETE_LABEL: "Xóa vĩnh viễn",
  CANCEL_LABEL: "Hủy",
} as const

