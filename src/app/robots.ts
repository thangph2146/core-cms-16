import { MetadataRoute } from "next"
import { appConfig } from "@/lib/config"

/**
 * Robots.txt for SEO
 * 
 * Theo Next.js 16 best practices:
 * - Export default function từ app/robots.ts
 * - Return MetadataRoute.Robots object
 * - Allow all crawlers cho public pages
 * - Disallow admin và API routes
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/[resource]/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${appConfig.url}/sitemap.xml`,
  }
}

