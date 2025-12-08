import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layouts/providers";
import { Toaster } from "@/components/ui/toaster";
import { appConfig } from "@/lib/config";
import { auth } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

/**
 * Root Layout Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge từ root layout xuống child layouts
 * - Child layouts có thể override hoặc extend metadata
 * - Sử dụng template cho title để có format nhất quán
 * - Open Graph và Twitter Card cho social sharing
 * - Robots configuration cho SEO
 * - metadataBase để set base URL cho tất cả relative URLs
 * - alternates.canonical cho SEO
 * - applicationName cho PWA support
 */
export const metadata: Metadata = {
  metadataBase: new URL(appConfig.url),
  title: {
    default: appConfig.titleDefault,
    template: appConfig.titleTemplate,
  },
  description: appConfig.description,
  keywords: appConfig.keywords,
  authors: appConfig.authors,
  creator: appConfig.creator,
  publisher: appConfig.publisher,
  applicationName: appConfig.name,
  openGraph: appConfig.openGraph,
  twitter: appConfig.twitter,
  robots: appConfig.robots,
  icons: appConfig.icons,
  manifest: appConfig.manifest,
  // verification: appConfig.verification,
  alternates: {
    canonical: "/",
  },
  category: "CMS",
  // Format detection
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false,
  },
  // Apple specific
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appConfig.name,
  },
  // Other
  other: {
    "mobile-web-app-capable": "yes",
  },
};

/**
 * Viewport Configuration
 * 
 * Theo Next.js 16 best practices:
 * - Viewport được export riêng từ metadata
 * - Responsive design với mobile-first approach
 */
export const viewport: Viewport = {
  width: appConfig.viewport.width,
  initialScale: appConfig.viewport.initialScale,
  maximumScale: appConfig.viewport.maximumScale,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth()

  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers initialSession={session}>
         {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
