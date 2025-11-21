import { MetadataRoute } from "next"
import { unstable_cache } from "next/cache"
import { appConfig } from "@/lib/config"
import { prisma } from "@/lib/database"

/**
 * Sitemap for SEO
 * 
 * Theo Next.js 16 best practices:
 * - Export default async function từ app/sitemap.ts
 * - Return MetadataRoute.Sitemap array
 * - Include all public pages
 * - Include dynamic routes (posts, categories, etc.)
 * - Set priority và changeFrequency cho SEO
 * - Sử dụng unstable_cache để cache sitemap và giảm database queries
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = appConfig.url

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/bai-viet`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ve-chung-toi`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/lien-he`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/huong-dan-su-dung`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ]

  // Dynamic pages - Published posts (cached)
  try {
    const postPages = await unstable_cache(
      async () => {
        const posts = await prisma.post.findMany({
          where: {
            published: true,
            deletedAt: null,
            publishedAt: {
              lte: new Date(),
            },
          },
          select: {
            slug: true,
            updatedAt: true,
          },
          take: 1000, // Limit to prevent too large sitemap
          orderBy: {
            updatedAt: "desc",
          },
        })

        return posts.map((post) => ({
          url: `${baseUrl}/bai-viet/${post.slug}`,
          lastModified: post.updatedAt,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }))
      },
      ['sitemap-posts'],
      {
        tags: ['posts', 'sitemap'],
        revalidate: 3600, // Revalidate every hour
      }
    )()

    return [...staticPages, ...postPages]
  } catch (error) {
    console.error("Error generating sitemap:", error)
    // Return static pages only if database query fails
    return staticPages
  }
}

