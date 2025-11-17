import type { Metadata } from "next"
import { appConfig } from "@/lib/config"
import { About } from "@/features/public/about/components"

/**
 * About Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với public layout và root layout
 * - Title sử dụng template từ root: "Về chúng tôi | CMS"
 * - Open Graph và Twitter Card cho social sharing
 */
export const metadata: Metadata = {
  title: "Về chúng tôi",
  description: "Trường Đại học Ngân hàng Thành phố Hồ Chí Minh (HUB) - Trường đại học công lập trực thuộc Ngân hàng Nhà nước Việt Nam, đào tạo nguồn nhân lực chất lượng cao trong lĩnh vực ngân hàng, tài chính và kinh tế.",
  openGraph: {
    ...appConfig.openGraph,
    title: "Về chúng tôi - Trường Đại học Ngân hàng TP.HCM",
    description: "Trường Đại học Ngân hàng Thành phố Hồ Chí Minh (HUB) - Trường đại học công lập trực thuộc Ngân hàng Nhà nước Việt Nam",
  },
  twitter: {
    ...appConfig.twitter,
    title: "Về chúng tôi - Trường Đại học Ngân hàng TP.HCM",
    description: "Trường Đại học Ngân hàng Thành phố Hồ Chí Minh (HUB) - Trường đại học công lập trực thuộc Ngân hàng Nhà nước Việt Nam",
  },
}

export default async function AboutPage() {
  return <About />
}

