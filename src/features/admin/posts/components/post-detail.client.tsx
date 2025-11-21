"use client"

import * as React from "react"
import { Hash, User, Calendar, Clock, Edit, Eye, EyeOff, CheckCircle2, Tag, Tags } from "lucide-react"
import { logger } from "@/lib/config"
import { 
  ResourceDetailPage, 
  FieldItem,
  type ResourceDetailField, 
  type ResourceDetailSection 
} from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { formatDateVi } from "../utils"
import { Editor } from "@/components/editor/editor-x/editor"
import type { SerializedEditorState } from "lexical"
import type { Prisma } from "@prisma/client"

export interface PostDetailData {
  id: string
  title: string
  slug: string
  content: Prisma.JsonValue
  excerpt: string | null
  image: string | null
  published: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  author: {
    id: string
    name: string | null
    email: string
  }
  categories?: Array<{
    id: string
    name: string
  }>
  tags?: Array<{
    id: string
    name: string
  }>
  [key: string]: unknown
}

export interface PostDetailClientProps {
  postId: string
  post: PostDetailData
  backUrl?: string
}

export function PostDetailClient({ postId, post, backUrl = "/admin/posts" }: PostDetailClientProps) {
  const router = useResourceRouter()

  const detailFields: ResourceDetailField<PostDetailData>[] = []

  const detailSections: ResourceDetailSection<PostDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về bài viết",
      fieldsContent: (_fields, data) => {
        const postData = data as PostDetailData

        return (
          <div className="space-y-6">
            {/* Image, Title, Description Section */}
            <div className="space-y-4">
              {/* Image */}
              {postData.image && (
                <div className="w-full relative" style={{ maxHeight: "400px" }}>
                  <Image
                    src={postData.image}
                    alt={postData.title}
                    width={800}
                    height={400}
                    className="w-full h-auto rounded-lg border border-border object-cover"
                    style={{ maxHeight: "400px" }}
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <h2 className="text-2xl font-bold text-foreground leading-tight">
                  {postData.title || "Chưa có tiêu đề"}
                </h2>
              </div>

              {/* Excerpt/Description */}
              {postData.excerpt && (
                <div className="text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {postData.excerpt}
                </div>
              )}
            </div>

            <Separator />

            {/* General Information Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Slug */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Slug</div>
                  <div className="text-sm font-medium text-foreground font-mono break-all">
                    {postData.slug || "—"}
                  </div>
                </div>
              </div>

              {/* Author */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Tác giả</div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-foreground">
                      {postData.author.name || "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {postData.author.email}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Categories */}
              {postData.categories && postData.categories.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">Danh mục</div>
                    <div className="flex flex-wrap gap-1.5">
                      {postData.categories.map((category) => (
                        <span
                          key={category.id}
                          className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              {postData.tags && postData.tags.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Tags className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">Thẻ tag</div>
                    <div className="flex flex-wrap gap-1.5">
                      {postData.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Published Status & Timestamps */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldItem icon={postData.published ? Eye : EyeOff} label="Trạng thái">
                <div className="flex items-center gap-2">
                  {postData.published ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                      <span className="text-sm font-medium text-foreground">Đã xuất bản</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-foreground">Bản nháp</span>
                    </>
                  )}
                </div>
              </FieldItem>

                {postData.publishedAt && (
                  <FieldItem icon={Calendar} label="Ngày xuất bản">
                    <div className="text-sm font-medium text-foreground">
                      {formatDateVi(postData.publishedAt)}
                    </div>
                  </FieldItem>
                )}
                <FieldItem icon={Clock} label="Ngày tạo">
                  <div className="text-sm font-medium text-foreground">
                    {formatDateVi(postData.createdAt)}
                  </div>
                </FieldItem>

              <FieldItem icon={Clock} label="Cập nhật lần cuối">
                <div className="text-sm font-medium text-foreground">
                  {formatDateVi(postData.updatedAt)}
                </div>
              </FieldItem>
            </div>

            {postData.deletedAt && (
              <>
                <Separator />
                <FieldItem icon={Clock} label="Ngày xóa">
                  <div className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    {formatDateVi(postData.deletedAt)}
                  </div>
                </FieldItem>
              </>
            )}
          </div>
        )
      },
    },
    {
      id: "content",
      title: "Nội dung",
      description: "Nội dung bài viết",
      fieldsContent: (_fields, data) => {
        const postData = data as PostDetailData

        // Parse content as SerializedEditorState
        let editorState: SerializedEditorState | null = null
        try {
          if (postData.content && typeof postData.content === "object") {
            editorState = postData.content as unknown as SerializedEditorState
          }
        } catch (error) {
          logger.error("Failed to parse editor state", error as Error)
        }

        return (
          <div className="max-w-5xl mx-auto space-y-4">
            {editorState ? (
              <Editor
                editorSerializedState={editorState}
                readOnly={true}
              />
            ) : (
              <Card className="border border-border/50 bg-card p-5">
                <div className="text-sm text-muted-foreground">
                  Không có nội dung hoặc định dạng không hợp lệ
                </div>
              </Card>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <ResourceDetailPage<PostDetailData>
      title={post.title}
      description={`Chi tiết bài viết ${post.slug}`}
      data={post}
      fields={detailFields}
      detailSections={detailSections}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      actions={
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/posts/${postId}/edit`)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Chỉnh sửa
        </Button>
      }
    />
  )
}

// Set displayName để tránh lỗi Performance API
PostDetailClient.displayName = "PostDetailClient"

