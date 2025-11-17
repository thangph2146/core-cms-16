import type { Metadata } from "next"
import { appConfig } from "@/lib/config"
import { Help } from "@/features/public/help/components"

/**
 * Help Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với public layout và root layout
 * - Title sử dụng template từ root: "Trợ giúp | CMS"
 * - Open Graph và Twitter Card cho social sharing
 */
export const metadata: Metadata = {
  title: "Trợ giúp",
  description: "Hướng dẫn sử dụng hệ thống và câu trả lời cho các câu hỏi thường gặp",
  openGraph: {
    ...appConfig.openGraph,
    title: "Trợ giúp - CMS",
    description: "Hướng dẫn sử dụng hệ thống và câu trả lời cho các câu hỏi thường gặp",
  },
  twitter: {
    ...appConfig.twitter,
    title: "Trợ giúp - CMS",
    description: "Hướng dẫn sử dụng hệ thống và câu trả lời cho các câu hỏi thường gặp",
  },
}

export default async function HelpPage() {
  return <Help />
}

