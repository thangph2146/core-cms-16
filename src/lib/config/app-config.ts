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
  namePublic: "Trường Đại học Ngân hàng TP.Hồ Chí Minh",
  company: "P.QLCNTT",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  
  // Social media
  social: {
    facebook: "",
    twitter: "",
    linkedin: "",
    instagram: "",
    youtube: "",
  },
  
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
    // apple: "/apple-icon.png", // Commented out - file không tồn tại
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
  [DEFAULT_ROLES.SUPER_ADMIN.name]: {
    name: "CMS Super Admin",
    description: "Hệ thống quản trị tối cao - Toàn quyền hệ thống",
  },
  [DEFAULT_ROLES.ADMIN.name]: {
    name: "CMS Admin",
    description: "Hệ thống quản trị nội dung và người dùng",
  },
  [DEFAULT_ROLES.EDITOR.name]: {
    name: "CMS Biên Tập",
    description: "Hệ thống biên tập và xuất bản nội dung",
  },
  [DEFAULT_ROLES.AUTHOR.name]: {
    name: "CMS Tác Giả",
    description: "Hệ thống quản lý bài viết và nội dung",
  },
  [DEFAULT_ROLES.USER.name]: {
    name: "CMS Người Dùng",
    description: "Hệ thống dành cho người dùng",
  },
  [DEFAULT_ROLES.PARENT.name]: {
    name: "CMS Phụ Huynh",
    description: "Hệ thống quản lý cho phụ huynh",
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

  // Ưu tiên check roles trước (chính xác hơn)
  if (roles && roles.length > 0) {
    for (const role of roles) {
      if (role?.name) {
        const key = role.name.toLowerCase()
        const branding = ROLE_BRANDING_MAP[key]
        if (branding) {
          return branding
        }
      }
    }
  }

  // Nếu không tìm thấy từ roles, thử resourceSegment như fallback
  if (resourceSegment) {
    const key = resourceSegment.toLowerCase()
    const branding = ROLE_BRANDING_MAP[key]
    if (branding) {
      return branding
    }
  }

  return fallback
}

