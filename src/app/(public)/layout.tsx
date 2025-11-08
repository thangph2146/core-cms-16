import type { Metadata } from "next"
import { PublicHeader } from "@/components/headers"
import { appConfig } from "@/lib/config"

/**
 * Public Layout Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với root layout
 * - Public pages nên được index cho SEO
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

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PublicHeader />
      {children}
    </>
  )
}
