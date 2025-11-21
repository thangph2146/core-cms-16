"use client"

import Link from "next/link"
import Image from "next/image"
import { Calendar, Tag, ArrowRight, FolderOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Post } from "@/features/public/post/types"
import { formatPostDate } from "@/features/public/post/utils/date-formatter"

interface PostCardProps {
  post: Post
  className?: string
}

export function PostCard({ post, className }: PostCardProps) {
  const primaryCategory = post.categories[0]
  const displayTags = post.tags.slice(0, 2)

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
    <article className={cn("group flex flex-col h-full bg-card rounded-lg border overflow-hidden transition-all hover:shadow-lg", className)}>
      <Link 
        href={`/bai-viet/${post.slug}`} 
        className="flex flex-col flex-1"
      >
        {/* Featured Image */}
        {post.image ? (
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div className="aspect-video w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Content */}
        <div className="flex flex-col flex-1 p-6">
          {/* Category Badge */}
          {primaryCategory && (
            <Badge variant="secondary" className="w-fit mb-3 text-xs font-medium">
              {primaryCategory.name}
            </Badge>
          )}

          {/* Title */}
          <h3 className="text-xl font-semibold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>

          {/* Date */}
          {post.publishedAt && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
              <Calendar className="h-4 w-4" />
              <time dateTime={getPublishedAtISO()}>
                {formatPostDate(post.publishedAt)}
              </time>
            </div>
          )}

          {/* Read Now Button */}
          <div className="mt-auto flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
            <span>Đọc ngay</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Link>

      {/* Tags */}
      {displayTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-4 border-t">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          {displayTags.map((tag) => (
            <Badge key={tag.id} variant="outline" className="text-xs">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
    </article>
  )
}


