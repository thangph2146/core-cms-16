import type { Metadata } from "next"
import { FileText, Filter } from "lucide-react"
import { PostList } from "@/features/public/post/components/post-list"
import { PostCategoryNav } from "@/features/public/post/components/post-category-nav"
import { PostSort } from "@/features/public/post/components/post-sort"
import { getPostsCached, getCategoriesCached } from "@/features/public/post/server/cache"
import { appConfig } from "@/lib/config"

export const metadata: Metadata = {
  title: "Bài viết",
  description: "Đọc các bài viết mới nhất từ chúng tôi",
  openGraph: {
    ...appConfig.openGraph,
    title: "Bài viết - CMS",
    description: "Đọc các bài viết mới nhất từ chúng tôi",
  },
  twitter: {
    ...appConfig.twitter,
    title: "Bài viết - CMS",
    description: "Đọc các bài viết mới nhất từ chúng tôi",
  },
}

interface PostPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    category?: string
    tag?: string
    sort?: string
  }>
}

export default async function PostPage({ searchParams }: PostPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const limit = 12

  const [result, categories] = await Promise.all([
    getPostsCached({
      page,
      limit,
      search: params.search,
      category: params.category,
      tag: params.tag,
      sort: (params.sort as "newest" | "oldest") || "newest",
    }),
    getCategoriesCached(),
  ])

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-7xl">

      {/* Category Navigation */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Danh mục:</span>
        </div>
        <PostCategoryNav categories={categories} />
      </div>

      {/* Header with Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-semibold">Tất cả bài viết</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {result.pagination.total} bài viết
          </p>
        </div>
        <PostSort />
      </div>

      {/* Post List */}
      <PostList
        posts={result.data}
        currentPage={result.pagination.page}
        totalPages={result.pagination.totalPages}
      />
    </div>
  )
}

