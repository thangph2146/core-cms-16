import type { Metadata } from "next"
import { appConfig } from "@/lib/config"
import { Contact } from "@/features/public/contact/components"

/**
 * Contact Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với public layout và root layout
 * - Title sử dụng template từ root: "Liên hệ | CMS"
 * - Open Graph và Twitter Card cho social sharing
 */
export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Liên hệ với Trường Đại học Ngân hàng TP.HCM. Gửi tin nhắn cho chúng tôi về bất kỳ vấn đề nào cần được giải quyết.",
  openGraph: {
    ...appConfig.openGraph,
    title: "Liên hệ - CMS",
    description: "Liên hệ với Trường Đại học Ngân hàng TP.HCM. Gửi tin nhắn cho chúng tôi về bất kỳ vấn đề nào cần được giải quyết.",
  },
  twitter: {
    ...appConfig.twitter,
    title: "Liên hệ - CMS",
    description: "Liên hệ với Trường Đại học Ngân hàng TP.HCM. Gửi tin nhắn cho chúng tôi về bất kỳ vấn đề nào cần được giải quyết.",
  },
}

export default async function ContactPage() {
  return <Contact />
}

