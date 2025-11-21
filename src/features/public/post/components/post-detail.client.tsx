"use client"

import { Calendar, User, Tag, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PostContent } from "./post-content"
import { formatPostDateLong } from "../utils/date-formatter"
import type { PostDetail } from "../types"

interface PostDetailClientProps {
  post: PostDetail
}

export function PostDetailClient({ post }: PostDetailClientProps) {
  // Helper function to convert publishedAt to ISO string
  // Handles both Date objects and string values (from serialization)
  const getPublishedAtISO = (): string => {
    if (!post.publishedAt) return ""
    if (typeof post.publishedAt === "string") {
      return post.publishedAt
    }
    if (post.publishedAt instanceof Date) {
      return post.publishedAt.toISOString()
    }
    // Fallback: convert to Date and then to ISO string
    const dateValue = post.publishedAt as string | number | Date
    return new Date(dateValue).toISOString()
  }

  return (
    <article className="space-y-8 py-8 sm:py-12">
        {/* Header */}
        <header className="space-y-6">

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">{post.author.name || post.author.email}</span>
            </div>
            {post.publishedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <time dateTime={getPublishedAtISO()}>
                  {formatPostDateLong(post.publishedAt)}
                </time>
              </div>
            )}
            {post.publishedAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {new Date(post.publishedAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
          <PostContent content={post.content} />
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-8 border-t">
            <Tag className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-sm">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </article>
  )
}

