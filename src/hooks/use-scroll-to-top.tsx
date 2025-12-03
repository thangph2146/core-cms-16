"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * Hook để tự động scroll về đầu trang khi pathname thay đổi
 * Sử dụng trong layout hoặc root component để đảm bảo mỗi khi chuyển page,
 * màn hình sẽ tự động scroll về đầu trang
 */
export function useScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    // Scroll to top khi pathname thay đổi
    // Sử dụng requestAnimationFrame + setTimeout để đảm bảo DOM đã render xong
    // và tất cả effects đã chạy xong
    const scrollToTop = () => {
      // Double RAF để đảm bảo DOM đã render hoàn toàn
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Scroll window về đầu trang
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant", // Dùng instant thay vì smooth để nhanh hơn
          })

          // Scroll main content area nếu có (thường là main element)
          const mainContent = document.querySelector("main")
          if (mainContent instanceof HTMLElement) {
            mainContent.scrollTo({
              top: 0,
              left: 0,
              behavior: "instant",
            })
          }

          // Nếu có scroll container (như ScrollArea), cũng scroll về đầu
          const scrollContainers = document.querySelectorAll(
            '[data-slot="scroll-area-viewport"]'
          )
          scrollContainers.forEach((container) => {
            if (container instanceof HTMLElement) {
              container.scrollTo({
                top: 0,
                left: 0,
                behavior: "instant",
              })
            }
          })
        })
      })
    }

    scrollToTop()
  }, [pathname])
}

