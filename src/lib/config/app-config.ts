/**
 * Global application configuration
 * 
 * Theo Next.js 16 best practices:
 * - Metadata configuration cho SEO và social sharing
 * - Open Graph và Twitter Card support
 * - Canonical URLs và robots configuration
 */
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

