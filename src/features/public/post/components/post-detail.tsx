/**
 * Server Component: Post Detail
 * 
 * Fetches post data và related posts, pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getPostBySlug, getRelatedPosts } from "../server/queries"
import { PostDetailClient } from "./post-detail.client"
import { RelatedPosts } from "./related-posts"
import { notFound } from "next/navigation"

export interface PostDetailProps {
  slug: string
}

export async function PostDetail({ slug }: PostDetailProps) {
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  // Get related posts based on categories and tags
  const categoryIds = post.categories.map((cat) => cat.id)
  const tagIds = post.tags.map((tag) => tag.id)
  const relatedPosts = await getRelatedPosts(post.id, categoryIds, tagIds, 4)

  return (
    <div className="container mx-auto px-4 max-w-5xl pb-12">
      <PostDetailClient post={post} />
      <RelatedPosts posts={relatedPosts} />
    </div>
  )
}

