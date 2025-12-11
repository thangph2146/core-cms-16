import type { Metadata } from "next"
import { appConfig } from "@/lib/config"
import { GuideClient } from "@/features/public/help/components/guide-client"

/**
 * Guide Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với public layout và root layout
 * - Title sử dụng template từ root: "Hướng dẫn sử dụng | CMS"
 * - Open Graph và Twitter Card cho social sharing
 */
export const metadata: Metadata = {
  title: "Hướng dẫn sử dụng",
  description: "Hướng dẫn chi tiết cách đăng ký và đăng nhập vào hệ thống",
  openGraph: {
    ...appConfig.openGraph,
    title: "Hướng dẫn sử dụng - CMS",
    description: "Hướng dẫn chi tiết cách đăng ký và đăng nhập vào hệ thống",
  },
  twitter: {
    ...appConfig.twitter,
    title: "Hướng dẫn sử dụng - CMS",
    description: "Hướng dẫn chi tiết cách đăng ký và đăng nhập vào hệ thống",
  },
}

export default async function GuidePage() {
  return <GuideClient />
}

