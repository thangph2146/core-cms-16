"use client"

import { useScrollToTop } from "@/hooks/use-scroll-to-top"

/**
 * Component để tự động scroll về đầu trang khi pathname thay đổi
 * Sử dụng trong Providers để đảm bảo mỗi khi chuyển page,
 * màn hình sẽ tự động scroll về đầu trang
 */
export function ScrollToTop() {
  useScrollToTop()
  return null
}

