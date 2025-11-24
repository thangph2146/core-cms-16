import { PostCard } from "@/components/public/post/post-card"
import { PostPagination } from "@/components/public/post/post-pagination"
import { PostEmptyState } from "./post-empty-state"
import type { Post } from "@/features/public/post/types"
import { Skeleton } from "@/components/ui/skeleton"

interface PostListProps {
  posts: Post[]
  currentPage: number
  totalPages: number
}

export function PostList({ posts, currentPage, totalPages }: PostListProps) {
  if (posts.length === 0) {
    return <PostEmptyState />
  }

  return (
    <>
      <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, index) => (
          <PostCard 
            key={post.id} 
            post={post} 
            priority={index < 3}
          />
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center pt-12">
          <PostPagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </>
  )
}

export function PostListSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}


