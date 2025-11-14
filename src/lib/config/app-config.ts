/**
 * Global application configuration
 * 
 * Theo Next.js 16 best practices:
 * - Metadata configuration cho SEO và social sharing
 * - Open Graph và Twitter Card support
 * - Canonical URLs và robots configuration
 */
import { DEFAULT_ROLES } from "@/lib/permissions"

export const appConfig = {
  // Basic metadata
  titleDefault: "CMS - Hệ thống quản trị nội dung",
  titleTemplate: "%s | CMS",
  description: "Hệ thống quản trị nội dung hiện đại, mạnh mẽ và dễ sử dụng",
  
  // Application info
  name: "CMS",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  
  // SEO
  keywords: ["CMS", "Content Management System", "Quản trị nội dung", "Admin Panel"] as string[],
  
  // Authors
  authors: [{ name: "PHGroup" }] as Array<{ name: string }>,
  
  // Creator
  creator: "PHGroup",
  
  // Publisher
  publisher: "PHGroup",
  
  // Open Graph
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    siteName: "CMS",
    title: "CMS - Hệ thống quản trị nội dung" as string,
    description: "Hệ thống quản trị nội dung hiện đại, mạnh mẽ và dễ sử dụng",
    // images: [
    //   {
    //     url: "/og-image.jpg",
    //     width: 1200,
    //     height: 630,
    //     alt: "CMS",
    //   },
    // ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image" as const,
    title: "CMS - Hệ thống quản trị nội dung" as string,
    description: "Hệ thống quản trị nội dung hiện đại, mạnh mẽ và dễ sử dụng",
    // images: ["/twitter-image.jpg"],
  },
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // Verification (nếu có)
  // verification: {
  //   google: "your-google-verification-code",
  //   yandex: "your-yandex-verification-code",
  // },
  
  // Icons
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  
  // Manifest
  manifest: "/manifest.json",
  
  // Viewport (được set trong layout, nhưng có thể reference ở đây)
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
} as const

export interface AppBranding {
  name: string
  description: string
}

const ROLE_BRANDING_MAP: Record<string, AppBranding> = {
  parent: {
    name: "CMS Phụ huynh",
    description: "Hệ thống quản lý dành riêng cho phụ huynh",
  },
  [DEFAULT_ROLES.SUPER_ADMIN.name]: {
    name: "CMS Siêu Quản Trị",
    description: "Toàn quyền cấu hình và giám sát hệ thống",
  },
  [DEFAULT_ROLES.ADMIN.name]: {
    name: "CMS Quản Trị",
    description: "Quản lý vận hành và dữ liệu nội bộ",
  },
  [DEFAULT_ROLES.EDITOR.name]: {
    name: "CMS Biên Tập",
    description: "Không gian sáng tạo nội dung và kiểm duyệt",
  },
  [DEFAULT_ROLES.AUTHOR.name]: {
    name: "CMS Tác Giả",
    description: "Nơi biên soạn và xuất bản bài viết nhanh chóng",
  },
  [DEFAULT_ROLES.USER.name]: {
    name: "CMS Người Dùng",
    description: "Trung tâm cập nhật thông tin và tương tác nội bộ",
  },
}

export function getAppBranding({
  roles,
  resourceSegment,
}: {
  roles?: Array<{ name?: string | null }>
  resourceSegment?: string | null
} = {}): AppBranding {
  const fallback: AppBranding = {
    name: appConfig.name,
    description: appConfig.description,
  }

  const lookupKeys: string[] = []

  if (resourceSegment) {
    lookupKeys.push(resourceSegment.toLowerCase())
  }

  roles?.forEach((role) => {
    if (role?.name) {
      lookupKeys.push(role.name.toLowerCase())
    }
  })

  for (const key of lookupKeys) {
    const branding = ROLE_BRANDING_MAP[key]
    if (branding) {
      return branding
    }
  }

  return fallback
}

