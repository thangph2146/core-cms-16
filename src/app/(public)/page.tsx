import type { Metadata } from "next"
import { appConfig } from "@/lib/config"
import { Home } from "@/features/public/home/components"

/**
 * Home Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với public layout và root layout
 * - Title sử dụng template từ root: "Trang chủ | CMS"
 * - Open Graph và Twitter Card cho social sharing
 */
export const metadata: Metadata = {
  title: "Trang chủ",
  description: appConfig.description,
  openGraph: {
    ...appConfig.openGraph,
    title: "Trang chủ - CMS",
    description: appConfig.description,
  },
  twitter: {
    ...appConfig.twitter,
    title: "Trang chủ - CMS",
    description: appConfig.description,
  },
}

export default async function HomePage() {
  return <Home />
}

