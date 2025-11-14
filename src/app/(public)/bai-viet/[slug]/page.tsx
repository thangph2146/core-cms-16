/**
 * Public Post Detail Page
 * 
 * Server Component - handles metadata generation and data fetching
 * Pattern: Page (Server) → PostDetail (Server) → PostDetailClient (Client)
 */

import type { Metadata } from "next"
import { getPostBySlugCached } from "@/features/public/post/server/cache"
import { PostDetail } from "@/features/public/post/components/post-detail"
import { appConfig } from "@/lib/config"

interface PostDetailPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlugCached(slug)

  if (!post) {
    return {
      title: "Không tìm thấy",
    }
  }

  return {
    title: post.title,
    description: post.excerpt || `Đọc bài viết: ${post.title}`,
    openGraph: {
      ...appConfig.openGraph,
      title: post.title,
      description: post.excerpt || `Đọc bài viết: ${post.title}`,
      images: post.image ? [post.image] : undefined,
    },
    twitter: {
      ...appConfig.twitter,
      title: post.title,
      description: post.excerpt || `Đọc bài viết: ${post.title}`,
      images: post.image ? [post.image] : undefined,
    },
  }
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { slug } = await params
  return <PostDetail slug={slug} />
}

