import type { Metadata } from "next"
import { NotFoundClient } from "../features/public/not-found-client"
import { appConfig } from "@/lib/config"

/**
 * Not Found Page
 * 
 * Theo Next.js 16 conventions:
 * - File not-found.tsx được đặt ở app directory để handle 404 errors
 * - Tự động được render khi route không tồn tại
 * - Có thể được trigger bằng notFound() function từ Server Components
 * 
 * Metadata:
 * - Export metadata từ server component để có SEO tốt hơn
 * - 404 pages thường không nên được index bởi search engines
 * 
 * Xem thêm: https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */

/**
 * Not Found Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với root layout
 * - Title sử dụng template từ root: "Trang không tìm thấy | CMS"
 * - Robots noindex để tránh index 404 pages
 */
export const metadata: Metadata = {
  title: "Trang không tìm thấy",
  description: "Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    ...appConfig.openGraph,
    title: "Trang không tìm thấy - CMS",
    description: "Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển",
  },
  twitter: {
    ...appConfig.twitter,
    title: "Trang không tìm thấy - CMS",
    description: "Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển",
  },
}

export default function NotFound() {
  return <NotFoundClient />
}
