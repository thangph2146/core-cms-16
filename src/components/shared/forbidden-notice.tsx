/**
 * ForbiddenNotice Component
 * 
 * Component chung để hiển thị thông báo không có quyền truy cập
 * Có thể tái sử dụng ở nhiều nơi trong ứng dụng
 * 
 * Tự động detect xem có SidebarProvider hay không để render header phù hợp
 */

"use client"

interface ForbiddenNoticeProps {
  /**
   * Breadcrumbs để hiển thị trên header
   * Nếu không truyền, sẽ hiển thị breadcrumb mặc định
   */
  breadcrumbs?: Array<{ label: string; href?: string; isActive?: boolean }>
  
  /**
   * Message tùy chỉnh cho thông báo
   * Nếu không truyền, sẽ dùng message mặc định
   */
  message?: string
  
  /**
   * Title tùy chỉnh cho thông báo
   * Nếu không truyền, sẽ dùng title mặc định
   */
  title?: string
}


export function ForbiddenNotice({
  message = "Bạn không có quyền truy cập trang này.",
  title = "Không có quyền truy cập",
}: ForbiddenNoticeProps) {

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex min-h-[400px] flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold">{title}</h2>
            <p className="text-muted-foreground">{message}</p>
          </div>
        </div>
      </div>
    </>
  )
}

