import type { Metadata } from "next"
import { Filter, Tags } from "lucide-react"
import { PostList } from "@/features/public/post/components/post-list"
import { PostCategoryNav } from "@/features/public/post/components/post-category-nav"
import { PostTagNav } from "@/features/public/post/components/post-tag-nav"
import { PostSort } from "@/features/public/post/components/post-sort"
import { getPosts, getCategories, getTags } from "@/features/public/post/server/queries"
import { appConfig } from "@/lib/config"
import { CollapsibleSection } from "@/features/public/post/components/collapsible-section"

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
    category?: string | string[]
    tag?: string | string[]
    sort?: string
  }>
}

export default async function PostPage({ searchParams }: PostPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const limit = 12

  // Normalize category and tag to arrays
  const categoriesParam = Array.isArray(params.category) 
    ? params.category 
    : params.category 
      ? [params.category] 
      : []
  const tagsParam = Array.isArray(params.tag)
    ? params.tag
    : params.tag
      ? [params.tag]
      : []

  const [result, categories, tags] = await Promise.all([
    getPosts({
      page,
      limit,
      search: params.search,
      categories: categoriesParam,
      tags: tagsParam,
      sort: (params.sort as "newest" | "oldest") || "newest",
    }),
    getCategories(),
    getTags(),
  ])

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 sm:gap-8 lg:gap-12">
        {/* Sidebar - Category Navigation & Tags */}
        <aside className="lg:sticky lg:top-20 lg:h-fit lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
          <div className="space-y-6 mb-6 lg:mb-0">
            {/* Category Navigation */}
            <CollapsibleSection
              title="Danh mục:"
              icon={<Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              defaultOpen={true}
            >
              <PostCategoryNav categories={categories} />
            </CollapsibleSection>

            {/* Tag Navigation */}
            <CollapsibleSection
              title="Thẻ tag:"
              icon={<Tags className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              defaultOpen={true}
            >
              <PostTagNav tags={tags} />
            </CollapsibleSection>
          </div>
        </aside>

        {/* Main Content */}
        <div className="min-w-0">
          {/* Header with Sort */}
          <div className="sticky top-14.5 z-50 w-full flex items-center justify-between gap-4 mb-8 border-b bg-background supports-[backdrop-filter]:bg-background/70 border-border backdrop-blur-lg">
            <div>
              <h2 className="text-2xl font-semibold">Tất cả bài viết</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {result.pagination.total} bài viết
              </p>
            </div>
            <div className="flex-shrink-0">
              <PostSort />
            </div>
          </div>

          {/* Post List */}
          <PostList
            posts={result.data}
            currentPage={result.pagination.page}
            totalPages={result.pagination.totalPages}
          />
        </div>
      </div>
    </div>
  )
}

